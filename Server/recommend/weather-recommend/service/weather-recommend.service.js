// weather-recommend.service.js
import { getWeatherData } from "../../../weather-api/weatherService.js";
// price-recommend.service.js 에서 로드된 alcohols 배열을 import
import { getAlcoholsData } from "../../price-recommend/service/price-recommend.service.js";

// 날씨 기반 추천 함수
export async function getAlcoholsByWeather(lat, lon, count = 6) {
  // 현재 날씨 데이터 가져오기
  const weatherData = await getWeatherData(lat, lon);
  const { precipitationType } = weatherData.weather;

  const alcohols = getAlcoholsData(); // 공용 alcohols 배열 가져오기
  let filtered;

  // 조건 예시: 비 오면 도수 높은 술, 맑으면 가벼운 술
  if (precipitationType === "1") {
    // 비 오는 경우: 도수 9도 이상
    filtered = alcohols.filter((a) => a.degree >= 9);
  } else {
    // 그 외: 도수 9도 이하
    filtered = alcohols.filter((a) => a.degree < 9);
  }

  // Fisher-Yates shuffle 후 count개 추출
  for (let i = filtered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
  }

  return {
    weather: weatherData.weather,
    recommendations: filtered.slice(0, count).map((a) => ({
      name: a.alcoholName,
      degree: a.degree,
      image: a.imageURL,
    })),
  };
}
