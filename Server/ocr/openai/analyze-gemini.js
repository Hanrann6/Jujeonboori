import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function analyzeLiquorInfo(rawText) {
  const prompt = `
아래는 전통주 병에 쓰인 텍스트입니다:
"""
${rawText}
"""

전통주의 이름, 도수, 단맛, 신맛, 쓴맛, 어울리는 음식, 구성 원재료를 추정하여 아래 형식의 JSON으로 응답해줘.

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

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}
