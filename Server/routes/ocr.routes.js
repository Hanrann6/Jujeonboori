import express from "express";
import multer from "multer";
import path from "path";
import { preprocessImage } from "../ocr/service/preprocessor.js";
import { runOCR } from "../ocr/service/ocr.js";
//import { analyzeLiquorInfo } from "../ocr/openai/analyze.js";
import { analyzeLiquorInfo } from "../ocr/openai/analyze-gemini.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// __dirname workaround for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const originalPath = req.file.path;
    const processedPath = path.join(
      __dirname,
      "..",
      "uploads",
      `processed_${req.file.filename}.jpg`
    );

    await preprocessImage(originalPath, processedPath);
    const ocrText = await runOCR(processedPath);
    //gpt 임시 주석 처리
    //const gptResponse = await analyzeLiquorInfo(ocrText);
    const gptResponse = await analyzeLiquorInfo(ocrText);

    // Gemini 응답 예: ```json\n{...}\n```
    const cleaned = gptResponse.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    res.json(parsed);

    //GPT 호출 생략하고 바로 텍스트 응답
    return res.json({ text: ocrText });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ocr 실패", message: err.message });
  }
});

export default router;
