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
  const prompt = `
당신은 전통주 상세 정보를 반환하는 AI 모델입니다.
아래는 전통주 병에 쓰인 텍스트입니다:
"""
${rawText}
"""

전통주의 이름, 도수, 단맛, 신맛, 쓴맛, 어울리는 음식, 구성 원재료를 검색하여 아래 형식의 JSON으로 응답하세요.
도수, 단맛, 신맛, 쓴맛은 숫자 형식으로 응답하세요.

정보가 없다면, 빈 문자열 ""로 응답하세요.
절대로 정보를 지어내지 마세요.

{
  "이름": "",
  "도수": "",
  "단맛": "",
  "신맛": "",
  "쓴맛": "",
  "어울리는 음식": "",
  "구성 원재료": ""
}
  
응답은 JSON 형식만 반환하세요.
`.trim();

  //const result = await model.generateContent(prompt);
  const result = await generateWithRetry(prompt);
  const response = await result.response;
  return response.text();
}
