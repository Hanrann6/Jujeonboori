import 'dotenv/config';
import { getWeatherData } from './weatherService.js'; // 파일 경로에 맞게 수정

async function testWeatherAPI() {
    console.log("🌤️ 기상청 API 테스트 시작");
    console.log("📍 서울시청 좌표로 날씨 정보 가져오기...\n");
    
    try {
        // 서울시청 좌표 (37.5665, 126.9780)
        const weatherData = await getWeatherData(37.5665, 126.9780);
        
        console.log("✅ API 호출 성공!");
        console.log("🗓️  기준 시간:", weatherData.baseTime.base_date, weatherData.baseTime.base_time);
        console.log("📍 격자 좌표:", `nx: ${weatherData.location.nx}, ny: ${weatherData.location.ny}`);
        console.log("\n🌡️ 현재 날씨 정보:");
        console.log(`   온도: ${weatherData.weather.temperature}°C`);
        console.log(`   습도: ${weatherData.weather.humidity}%`);
        console.log(`   강수량: ${weatherData.weather.rainAmount}mm`);
        console.log(`   강수형태: ${weatherData.weather.precipitationTypeDescription}`);
        console.log(`   하늘상태: ${weatherData.weather.skyStatusDescription}`);
        console.log(`   풍속: ${weatherData.weather.windSpeed}m/s`);
        console.log(`   풍향: ${weatherData.weather.windDirection}도`);
        
        // 날씨에 따른 간단한 추천 로직 테스트
        console.log("\n🍶 날씨 기반 간단 추천:");
        const temp = weatherData.weather.temperature;
        const rain = weatherData.weather.precipitationTypeDescription;
        
        if (rain === '비' || rain === '비/눈') {
            console.log("   → 비가 오니까 부침개와 막걸리가 딱이겠네!");
        } else if (temp > 25) {
            console.log("   → 더운 날씨! 시원한 생맥주나 소주하이볼 어때?");
        } else if (temp < 10) {
            console.log("   → 쌀쌀한 날씨! 따뜻한 소주나 도수 높은 전통주 추천!");
        } else {
            console.log("   → 적당한 날씨! 취향에 맞는 술 골라마셔~");
        }
        
    } catch (error) {
        console.error("❌ 테스트 실패:", error.message);
        
        // 환경변수 체크
        console.log("\n🔍 환경변수 체크:");
        console.log(`SERVICE_KEY: ${process.env.WEATHER_API_SERVICE_KEY ? '✅ 설정됨' : '❌ 없음'}`);
        console.log(`API_BASE_URL: ${process.env.WEATHER_API_BASE_URL ? '✅ 설정됨' : '❌ 없음'}`);
        
        if (!process.env.WEATHER_API_SERVICE_KEY) {
            console.log("\n💡 .env 파일에 WEATHER_API_SERVICE_KEY를 추가해주세요!");
        }
    }
}

// 여러 지역 테스트
async function testMultipleLocations() {
    console.log("\n🗺️ 여러 지역 날씨 테스트");
    
    const locations = [
        { name: "서울", lat: 37.5665, lon: 126.9780 },
        { name: "부산", lat: 35.1796, lon: 129.0756 },
        { name: "제주", lat: 33.4996, lon: 126.5312 }
    ];
    
    for (const location of locations) {
        console.log(`\n--- ${location.name} ---`);
        try {
            const weather = await getWeatherData(location.lat, location.lon);
            console.log(`온도: ${weather.weather.temperature}°C, ${weather.weather.skyStatusDescription}, ${weather.weather.precipitationTypeDescription}`);
        } catch (error) {
            console.log(`${location.name} 날씨 조회 실패: ${error.message}`);
        }
        
        // API 호출 간격 두기 (너무 자주 호출하면 제한걸릴 수 있어)
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// 메인 실행
console.log("기상청 API 단독 테스트");
console.log("=".repeat(50));

testWeatherAPI()
    .then(() => {
        console.log("\n" + "=".repeat(50));
        return testMultipleLocations();
    })
    .then(() => {
        console.log("\n🎉 모든 테스트 완료!");
    })
    .catch((error) => {
        console.error("테스트 중 오류:", error);
    });