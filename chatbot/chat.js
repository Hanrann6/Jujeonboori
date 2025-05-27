import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import OpenAI from "openai";
import fs from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // API 키를 .env에서 불러옴
});

async function askQuestion(question) {
  try {
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: question }],
    });

    const answer = chatCompletion.choices[0].message.content;
    console.log("ChatGPT 답변:", answer);
  } catch (error) {
    console.error("에러 발생:", error);
  }
}

// 질문 (txt에 있음)
const question = fs.readFileSync("question.txt", "utf-8");
askQuestion(question);