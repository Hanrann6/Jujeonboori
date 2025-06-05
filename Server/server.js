import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { getWeatherData } from './weather-api/weatherService.js';
import { recommendItemsBasedOnWeather } from './recommend/recombeeWeatherTest.js';

const app = express();
const PORT = process.env.SERVER_PORT;

app.use(cors());
app.use(express.json());

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


// --- 날씨 기반 Recombee 추천 테스트 API 엔드포인트 ---
app.get('/test-recombee-weather-recommendation', async (req, res) => {
    // 서울 위치로 임시 설정
    const userId = req.query.userId || "test_user_for_weather"; 
    const lat = req.query.lat || 37.5665;
    const lon = req.query.lon || 126.9780;

    // 사용자의 기본 선호도 (임시 값, 실제 앱에서는 DB에서 가져옴)
    const userBasePref = {
        sweetness: 3,
        sourness: 2,
        sparkling: 2,
        body: 3,
        abv: 12,
        type: "탁주", 
        minPrice: 7000,
        maxPrice: 15000
    };

    try {
        const weatherResult = await getWeatherData(parseFloat(lat), parseFloat(lon));
        const currentWeather = weatherResult.weather;

        const recommendations = await recommendItemsBasedOnWeather(
            userId,
            5, // 추천 개수
            userBasePref,
            currentWeather
        );

        res.json({
            success: true,
            weather: currentWeather,
            recommendations: recommendations,
            message: "날씨 기반 Recombee 추천 테스트 결과입니다."
        });

    } catch (error) {
        console.error('Recombee 날씨 추천 테스트 엔드포인트 오류:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// (추후) 챗봇 API 엔드포인트 추가될 위치

app.listen(PORT, () => {
    console.log(`✅ 백엔드 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    console.log(`날씨 기반 추천 테스트 URL: http://localhost:${PORT}/recommend/weather?lat=37.5665&lon=126.9780`);
    console.log(`Recombee 날씨 추천 테스트 URL: http://localhost:${PORT}/test-recombee-weather-recommendation?lat=37.5665&lon=126.9780&userId=test_user_for_weather`);
});