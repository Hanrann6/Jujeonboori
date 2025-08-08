import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

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
    console.error("❌ OCR 오류:", error.message);
    throw new Error("ocr 실패");
  }
}
