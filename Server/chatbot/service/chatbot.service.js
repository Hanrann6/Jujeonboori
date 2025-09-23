import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { qdrant, COLLECTION_NAME } from "./qdrant.service.js";
import { pipeline } from "@xenova/transformers";
import dotenv from "dotenv";
dotenv.config();

// 로컬 임베더 초기화 (MiniLM, 384차원)
let embedder;
async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return embedder;
}

async function embedQuery(text) {
  const extractor = await getEmbedder();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

// Gemini Chat 모델
const chatModel = new ChatGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  model: "gemini-2.0-flash",
  temperature: 0.7,
});

function cleanJsonResponse(raw) {
  if (!raw) return null;

  // Gemini 응답이 배열이면 text 꺼내기
  let text = Array.isArray(raw) ? raw[0]?.text : raw;

  if (typeof text !== "string") {
    console.error("응답이 문자열이 아님:", text);
    return null;
  }

  // 코드블럭 제거
  text = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("JSON 파싱 실패:", err, "원본:", text);
    return null;
  }
}


export async function recommendSool(userQuestion) {
  // 로컬 임베딩
  const questionVec = await embedQuery(userQuestion);
  const result = await qdrant.search(COLLECTION_NAME, {
    vector: questionVec,
    limit: 5,
  });

  const soolList = result.map((r) => r.payload);

  const context = soolList
    .map((d) => `- ${d.alcoholName} (${d.degree}%): ${d.keyword}`)
    .join("\n");

  const prompt = `
너는 대한민국 전통주에 정통한 "전통주 추천 전문가 AI"야.

당신의 역할은 다음과 같습니다:

사용자가 입력한 문장에는 음식, 기분, 날씨, 계절, 상황, 장소, 분위기 등의 요소가 포함될 수 있습니다.  
당신은 그 내용을 바탕으로 아래에 제공된 전통주 목록 내에서만, 사용자에게 가장 적절한 전통주를 추천해야 합니다.

### 중요 조건:

1. 반드시 아래 전통주 목록 내의 제품명에서만 추천을 골라야 하며, 외부 지식이나 추가 정보를 사용해서 새로운 전통주를 생성하거나 추론하지 마세요.
2. 추천 결과는 단순히 이름만 나열하는 것이 아니라, 아래 요소들을 반드시 json 형식으로 출력하세요. 문자열 형태로 감싸지 마세요. 응답 전체가 JSON 객체여야 합니다.:
   [
  {
    "name": "제품명",
    "summary": "특징 요약",
    "reason": "사용자 질문에 어울리는 이유",
    "image": "이미지 URL",
    "detailPage": "상세페이지 URL"
  },
  ...
]
3. 추천 순서는 관련도 순으로 가장 잘 맞는 술부터 배치하세요.
4. 추천 항목마다 줄바꿈과 구분을 통해 사용자 입장에서 보기 쉽게 구성하세요.

### 데이터 제한 조건:

- 사용자는 질문만 입력하며, 전통주 목록 외에 다른 설명은 존재하지 않습니다.
- 제공된 전통주 목록 외 정보를 참고하거나 상상해서 보완하지 마세요.
- 추천하지 않은 전통주의 정보는 언급하지 마세요.

---

이제 사용자 질문과 전통주 목록을 제공합니다. 이를 바탕으로 위 조건을 모두 지켜 추천을 수행하세요.

전통주 목록:
${context}

사용자 질문:
${userQuestion}
`.trim();

  const res = await chatModel.invoke([{ role: "user", content: prompt }]);

  return cleanJsonResponse(res.content);
}
