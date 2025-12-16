// check-models.js
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY; 

// 현재 gemini api key에서 사용 가능한 모델 출력 함수
async function getAvailableModels() {
  if (!API_KEY) {
    console.error(".env 파일에 GEMINI_API_KEY가 없습니다!");
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("에러 발생:", data.error.message);
      return;
    }

    console.log("현재 사용 가능한 모델 목록:");
    console.log("------------------------------------------------");

    // 'generateContent' 기능이 있는 모델만 필터링해서 출력
    const chatModels = data.models.filter((m) =>
      m.supportedGenerationMethods.includes("generateContent")
    );

    chatModels.forEach((model) => {
      // 모델로 변환해서 출력
      const modelId = model.name.replace("models/", "");
      console.log(`🔹 모델 ID: ${modelId}`);
      console.log(`   설명: ${model.description}`);
      console.log("------------------------------------------------");
    });
  } catch (error) {
    console.error("통신 오류:", error);
  }
}

getAvailableModels();
