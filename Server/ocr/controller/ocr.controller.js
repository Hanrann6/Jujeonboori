import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { processImageForOcr } from "../service/ocr.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ocr 컨트롤러
export const handleOcrUpload = async (req, res) => {
  try {
    const originalPath = req.file.path;

    // 경로 계산
    const processedPath = path.join(
      __dirname,
      "..",
      "uploads",
      `processed_${req.file.filename}.jpg`
    );

    // 서비스 함수 호출
    const result = await processImageForOcr(originalPath, processedPath);

    // 응답
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ocr 실패", message: err.message });
  }
};