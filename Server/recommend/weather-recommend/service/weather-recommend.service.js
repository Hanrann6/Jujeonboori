// price-recommend.service.js 에서 로드된 alcohols 배열을 import
import { getAlcoholsData } from "../../price-recommend/service/price-recommend.service.js";

// 날씨 기반 추천 함수
export async function getAlcoholsByWeather(temperature, precipitationType, count = 6) {

  const alcohols = getAlcoholsData(); // 공용 alcohols 배열 가져오기

  let adjusted = alcohols.map((a) => ({
    ...a,
    freshness: Number(a.freshness) || 0, // 청량감
    sweetness: Number(a.sweetness) || 0, // 단맛
    degree: Number(a.degree) || 0, // 도수
    alcoholType: a.alcoholType,
  }));

  // 온도별 조정 기준
  if (temperature > 25) {
    // 더운 날
    adjusted = adjusted.map((a) => ({
      ...a,
      freshness: Math.min(a.freshness + 1, 5), // +1 (최대5)
      degree: Math.max(a.degree - 3, 3), // -3 (최소3)
      sweetness: Math.min(a.sweetness + 1, 5), // +1 (최대5)
    }));
  } else if (temperature < 10) {
    // 추운 날
    adjusted = adjusted.map((a) => ({
      ...a,
      degree: Math.min(a.degree + 5, 50), // +5 (최대50)
      sweetness: Math.min(a.sweetness + 1, 5), // +1 (최대5)
      freshness: Math.max(a.freshness - 1, 1), // -1 (최소1)
    }));
  }
  // 10~25도는 조정 없음

  // 날씨별 조정
  let filtered = adjusted;

  if (precipitationType === "1") {
    // 비 오는 날 → 탁주 추천
    filtered = filtered.filter((a) => a.alcoholType === "탁주");
  } else if (precipitationType === "0") {
    // 맑은 날 → 청량감 높은 술
    filtered = filtered
      .map((a) => ({ ...a, freshness: Math.min(a.freshness + 2, 5) }))
      .sort((a, b) => b.freshness - a.freshness);
  }

  // Fisher-Yates shuffle 후 count개 추출
  for (let i = filtered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
  }

  return filtered.slice(0, count).map((a) => ({
    index: a.index,
    name: a.alcoholName,
    degree: a.degree,
    image: a.imageUrl,
  }));
}
