import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

import { preprocessImage } from "./preprocessor.js";
import { analyzeLiquorInfo } from "../openai/analyze-gemini.js";

dotenv.config();

// 전체 ocr 흐름
export async function processImageForOcr(originalPath, processedPath) {
  // 이미지 전처리
  await preprocessImage(originalPath, processedPath);

  // OCR 실행
  const ocrText = await runOCR(processedPath);

  // AI 분석 - gemini
  const llmResponse = await analyzeLiquorInfo(ocrText);
  const cleaned = llmResponse.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);
  return parsed; // AI 분석 결과 반환
}

// naver clova ocr 실행
export async function runOCR(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);

    const requestBody = {
      version: "V2",
      requestId: Date.now().toString(),
      timestamp: Date.now(),
      images: [
        {
          format: "jpg", // 또는 png
          name: "image",
          data: imageBuffer.toString("base64"),
        },
      ],
    };

    const response = await axios.post(
      process.env.NAVER_OCR_INVOKE_URL,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          "X-OCR-SECRET": process.env.NAVER_OCR_SECRET,
        },
      }
    );

    const textResults =
      response.data.images?.[0]?.fields?.map((field) => field.inferText) || [];

    return textResults.join("\n");
  } catch (error) {
    console.error("OCR 오류:", error.message);
    throw new Error("OCR 실패");
  }
}
