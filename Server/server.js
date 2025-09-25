import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import mongoose from "mongoose";
import recommendRoutes from "./routes/recommend.routes.js";
import bookmarkRoutes from "./routes/bookmark.routes.js";
import ocrRoutes from "./routes/ocr.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import alcoholRoutes from "./routes/alcohol.routes.js";
import priceRecommendRoutes from "./routes/price-recommend.routes.js"
import weatherRecommendRouter from "./routes/weather-recommend.routes.js";
import { loadAlcoholData } from "./recommend/price-recommend/service/price-recommend.service.js"
import festivalRoutes from "./routes/festival.routes.js";
import { getWeatherData } from './weather-api/weatherService.js';
import preferencesRouter from "./routes/preference.routes.js";
import chatbotRouter from "./routes/chatbot.routes.js"
//import { recommendItemsBasedOnWeather } from './recommend/recombee/recombeeWeatherTest.js';
import { askGPT, loadCSVData } from "./chatbot/chat.js";

const app = express();
const PORT = process.env.SERVER_PORT;

app.use(cors());
app.use(express.json());

// CSV 로드 후 서버 시작
loadAlcoholData()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`백엔드 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
      console.log(
        `날씨 기반 추천 테스트 URL: http://localhost:${PORT}/recommend/weather?lat=37.5665&lon=126.9780`
      );
      console.log(`Chatbot URL: http://localhost:${PORT}/chat`);
      console.log(
        `OAuth 테스트 URL: http://localhost:${PORT}/oauth/google?code_challenge=test123&code_challenge_method=S256`
      );
      console.log(`User 프로필 API: http://localhost:${PORT}/users/me`);
      console.log(`축제 연결 테스트: http://localhost:${PORT}/festivals`);
      console.log(`가격 기반 추천 API: http://localhost:${PORT}/recommend/price/?price=30000`);
    });
  })
  .catch((err) => {
    console.error("CSV 로딩 실패:", err);
  });

// 몽고DB 연결
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB 연결 완료"))
  .catch((err) => console.error("MongoDB 연결 실패", err));

// 추천 라우터
app.use("/recommendations", recommendRoutes);
//가격별 추천 라우터
app.use("/recommend/price", priceRecommendRoutes);
//날씨별 추천 라우터
app.use("/recommend/weather", weatherRecommendRouter);
// 북마크 라우터
app.use("/bookmark", bookmarkRoutes);
// 챗봇 라우터
app.use("/chatbot", chatbotRouter);
// ocr 라우터
app.use("/ocr", ocrRoutes);
// OAuth 라우터
app.use("/oauth", authRoutes);
// 프로필 라우터
app.use("/users", userRoutes);
// 전통주 조회 라우터
app.use("/alcohols", alcoholRoutes);
// 축제 라우터
app.use("/festivals", festivalRoutes);
// 선호도 테스트 라우터
app.use("/preference", preferencesRouter);

app.get('/weather-info', async (req, res) => {
    const lat = req.query.lat;
    const lon = req.query.lon;
    if (!lat || !lon) {
        return res.status(400).json({ success: false, error: '위도(lat)와 경도(lon)는 필수입니다.' });
    }
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    try {
        const weatherInfo = await getWeatherData(latitude, longitude);
        res.json({
            success: true,
            location: weatherInfo.location,
            weather: weatherInfo.weather
        });
    } catch (error) {
        console.error('날씨 정보 API 오류:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});



