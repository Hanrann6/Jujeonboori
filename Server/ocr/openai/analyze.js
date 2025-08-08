import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  return res.choices[0].message.content;
}
