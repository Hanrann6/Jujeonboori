import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { qdrant, COLLECTION_NAME } from "./qdrant.service.js";
import { pipeline } from "@xenova/transformers";
import ChatLog from "../model/chatbot.model.js";
import dotenv from "dotenv";
import { Embeddings } from "@langchain/core/embeddings";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence, RunnableLambda } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import path from "path";
import fs from "fs";

dotenv.config();

let embedderInstance;

class XenovaEmbeddings extends Embeddings {
  // 생성자를 추가
  constructor() {
    super({}); // 부모 클래스(Embeddings)를 초기화
  }

  async getEmbedder() {
    if (!embedderInstance) {
      embedderInstance = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2"
      );
    }
    return embedderInstance;
  }

  async embedQuery(text) {
    const extractor = await this.getEmbedder();
    const output = await extractor(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  }

  async embedDocuments(texts) {
    const extractor = await this.getEmbedder();
    const outputs = [];
    for (const text of texts) {
      const output = await extractor(text, {
        pooling: "mean",
        normalize: true,
      });
      outputs.push(Array.from(output.data));
    }
    return outputs;
  }
}

// 임베딩을 위한 쿼리 정제 함수
function cleanQueryForEmbedding(query) {
  // 제거할 공통 구문
  const noisePhrases = [
    "전통주 추천해 줘",
    "전통주 추천",
    "추천해 줘",
    "추천해",
    "전통주",
    "술",
  ];

  let cleanedQuery = query;
  for (const phrase of noisePhrases) {
    // 공통 구문을 공백으로 대체
    cleanedQuery = cleanedQuery.replace(phrase, " ");
  }

  // 양쪽 공백 제거
  cleanedQuery = cleanedQuery.trim();

  // 쿼리가 비어버린 경우 안전하게 원본 쿼리를 사용
  if (cleanedQuery.length === 0) {
    return query;
  }

  return cleanedQuery;
}

// json 파싱 함수
function cleanJsonResponse(raw) {
  if (!raw) return null;

  // Gemini 응답이 배열이거나 텍스트가 아닐 수 있음
  let text = Array.isArray(raw) ? raw[0]?.text : raw;

  if (typeof text !== "string") {
    console.error("응답이 문자열이 아님:", text);
    return null;
  }

  // 코드블럭 제거 (```json ... ```)
  text = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(text); // JSON으로 파싱
  } catch (err) {
    console.error("JSON 파싱 실패:", err, "원본:", text);
    return null;
  }
}

// 랭체인 컴포넌트 정의
// 임베딩 모델
const embeddings = new XenovaEmbeddings();

// Gemini 모델
const chatModel = new ChatGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  model: "gemini-1.5-flash",
  temperature: 0.7,
});

// 프롬프트
// context와 userQuestion 변수를 받도록
const promptTempletePath = path.resolve(process.cwd(), "chatbot/utils/prompt.txt");
const promptTemplateString = fs.readFileSync(promptTempletePath, "utf-8");
const prompt = ChatPromptTemplate.fromTemplate(promptTemplateString);

// 출력 파서
const outputParser = new StringOutputParser();

// 랭체인 체인의 첫 번째 단계로 사용될 비동기 함수
async function retrieveAndFormatContext(input) {
  const userQuestion = input.userQuestion;

  // 임베딩 전 질문 정제
  const cleanedQuestion = cleanQueryForEmbedding(userQuestion);

  // 네이티브 임베딩
  const questionVec = await embeddings.embedQuery(cleanedQuestion);

  // 네이티브 Qdrant 검색
  const result = await qdrant.search(COLLECTION_NAME, {
    vector: questionVec,
    limit: 6,
  });

  // 네이티브 검색 결과로 Context 포매팅
  const soolList = result.map((r) => r.payload);

  if (soolList.length === 0 || !soolList[0]) { // 0개 또는 빈 payload 방어
    console.log("Qdrant 검색 결과 0개");
    return "일치하는 전통주 정보를 찾지 못했습니다.";
  }

  // d의 속성을 바로 사용
  const contextString = soolList
    .map(
      (d) =>
        `- alcoholId: ${d.index}, 제품명: ${d.alcoholName} , 도수: (${
          d.degree
        }%), 어울리는 음식: ${d.foodPairing}, 키워드: ${d.keyword}, imageUrl: ${
          d.imageUrl || "없음"
        }`
    )
    .join("\n");
  
  console.log("전달되는 Context: ");
  console.log(contextString);

  // 체인의 다음 단계로 context, userQuestion 객체를 전달
  return {
    context: contextString,
    userQuestion: userQuestion,
  };
}

// 랭체인 체인(LCEL) 정의
const recommendSoolChain = RunnableSequence.from([
  // 1. 입력을 받아 {context}와 {userQuestion}을 생성
  new RunnableLambda({ func: retrieveAndFormatContext }),
  // 2. 1의 결과를 프롬프트에 주입
  prompt,
  // 3. 프롬프트를 Gemini 모델에 전달
  chatModel,
  // 4. Gemini 응답을 JSON으로 파싱
  outputParser,
  // 5. 수동 파싱
  cleanJsonResponse,
]);


// 랭체인 체인 호출
export async function recommendSool(userId, userQuestion) {
  // 랭체인 체인 실행
  const rawAnswer = await recommendSoolChain.invoke({ userQuestion });

  // (필수!) null 방어 로직 (Gemini가 JSON이 아닌 텍스트 반환 시 대비)
  const answer = rawAnswer || {
    answer: "죄송합니다. 질문에 맞는 전통주를 찾을 수 없습니다.",
    result: [],
  };

  // 대화 기록 저장
  try {
    await ChatLog.create({
      userId,
      question: userQuestion,
      answer, // JSON 객체
    });
  } catch (err) {
    console.error("대화 저장 실패:", err);
  }

  return answer;
}


export async function getChatLogs(userId) {
  return await ChatLog.find({ userId }).sort({ createdAt: -1 });
}
