// test-env.js
import 'dotenv/config';

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('SERVICE_KEY:', process.env.WEATHER_API_SERVICE_KEY ? '있음' : '없음');
console.log('API_BASE_URL:', process.env.WEATHER_API_BASE_URL ? '있음' : '없음');

// 실제 값 확인 (키 일부만 보여주기)
if (process.env.WEATHER_API_SERVICE_KEY) {
    const key = process.env.WEATHER_API_SERVICE_KEY;
    console.log('KEY 앞부분:', key.substring(0, 10) + '...');
}