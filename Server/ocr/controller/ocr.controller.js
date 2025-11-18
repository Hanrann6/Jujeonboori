import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { processImageForOcr } from "../service/ocr.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ocr 컨트롤러
export const handleOcrUpload = async (req, res) => {

  // finally 블록에서 사용하기 위해 밖으로 빼냄
  let originalPath;
  let processedPath;

  try {
    originalPath = req.file.path;

    // 경로 계산
    processedPath = path.join(
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
  } finally {
    //  항상 실행됨
    try {
      // 원본 파일 삭제
      await fs.promises.unlink(originalPath);
      console.log(`삭제 완료: ${originalPath}`);

      // 전처리된 파일 삭제(있으면)
      if (fs.existsSync(processedPath)) {
        await fs.promises.unlink(processedPath);
        console.log(`삭제 완료: ${processedPath}`);
      }
    } catch (cleanupErr) {
      // 파일 삭제 실패는 치명적인 오류가 아니므로 로그만 남김
      console.error("임시 파일 삭제 중 오류:", cleanupErr);
    }
  }
};
