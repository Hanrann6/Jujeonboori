import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// 지수 Backoff
async function generateWithRetry(prompt, retries = 5, initialDelay = 1000) {
  let currentDelay = initialDelay;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // API 호출 시도
      const result = await model.generateContent(prompt);
      return result;
    } catch (error) {
      // 429(Too Many Requests) 확인
      const isRateLimit =
        error.status === 429 ||
        (error.message && error.message.includes("429"));
      const isServerOverloaded = error.status === 503;

      // 마지막 시도였거나, 재시도 할 필요 없는 에러면 throw
      if (attempt === retries || (!isRateLimit && !isServerOverloaded)) {
        console.error(
          `최종 실패 (시도 ${attempt + 1}/${retries + 1}):`,
          error.message
        );
        throw error;
      }

      // 지수 백오프 + Jitter 적용
      const jitter = Math.random() * 500;
      const waitTime = currentDelay + jitter;

      console.warn(
        `API 제한(429) 감지. ${Math.round(waitTime)}ms 후 재시도합니다... (${
          attempt + 1
        }/${retries}회)`
      );

      // 대기 (Promise)
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      // 다음 대기 시간 2배 증가
      currentDelay *= 2;
    }
  }
}

export async function analyzeLiquorInfo(rawText) {
  console.log("============= [DEBUG] INPUT TEXT =============");
  console.log(rawText);
  console.log("==============================================");
  const prompt = `
당신은 전통주 상세 정보를 반환하는 AI 모델입니다.
아래는 전통주 병에 쓰인 텍스트입니다:
"""
${rawText}
"""

1. 전통주의 이름, 도수, 단맛, 신맛, 쓴맛, 어울리는 음식, 구성 원재료를 검색하여 아래 형식의 JSON으로 응답해.
2. 오타가 있거나 정보가 불완전해도 최대한 추측해서 채워줘.
3. 단맛, 신맛, 쓴맛: 검색하여 0~5 숫자로 추정해.(0: 아예 없음, 5: 매우 강함)
4. 도수는 숫자로 응답해.
5. 어울리는 음식: 전통주에 어울리는 안주나 음식이 있으면 나열해서 적어.
6. 구성 원재료: 재료명으로 보이는 단어들을 나열해.

{
  "이름": "",
  "도수": "",
  "단맛": "",
  "신맛": "",
  "쓴맛": "",
  "어울리는 음식": "",
  "구성 원재료": ""
}
  
응답은 JSON 형식만 반환해.
`.trim();

  //const result = await model.generateContent(prompt);
  const result = await generateWithRetry(prompt);
  const response = await result.response;
  return response.text();
}
