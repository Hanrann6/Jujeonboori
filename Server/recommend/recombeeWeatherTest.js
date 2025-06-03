import * as recombee from "recombee-api-client";
import 'dotenv/config';
import { getWeatherData } from '../weather-api/weatherService.js';

const rqs = recombee.requests;

// Recombee 클라이언트 설정
const client = new recombee.ApiClient(
    process.env.RECOMBEE_DB,
    process.env.RECOMBEE_PRIVATE_TOKEN,
    {
        region: "eu-west",
        timeout: 10000,
    }
);

/**
 * 사용자 선호도 기반으로 아이템을 추천하는 함수
 * @param {string} userId - 사용자 ID
 * @param {number} count - 추천받을 아이템 수
 * @param {object} preference - 사용자의 고정 선호도 (단맛, 신맛 등)
 * @param {object} weatherData - 현재 날씨 데이터 (기온, 강수 형태 등)
 * @returns {Promise<Array<object>>} - 추천 아이템 목록
 */
export async function recommendItemsBasedOnWeather(userId, count = 5, preference = {}, weatherData = {}) {
    const { sweetness, sourness, sparkling, body, abv, type, minPrice, maxPrice } = preference;

    // 날씨 데이터에 따라 선호도 조정
    let adjustedSweetness = sweetness;
    let adjustedSparkling = sparkling;
    let adjustedAbv = abv;
    let adjustedType = type;
    let curationMessage = "추천 이유: ";

    if (weatherData.temperature) {
        if (weatherData.temperature > 25) { // 25도 초과: 더운 날
            adjustedSparkling = Math.min(5, sparkling + 1); // 청량감 증가
            adjustedAbv = Math.max(3, abv - 3); // 도수 낮춤
            adjustedSweetness = Math.min(5, sweetness + 1); // 단맛 증가 (시원한 과일맛)
            curationMessage += `날씨가 더워서 시원하고 청량감 있는 낮은 도수의 술을 추천합니다.`;
        } else if (weatherData.temperature < 10) { // 10도 미만: 추운 날
            adjustedAbv = Math.min(50, abv + 5); // 도수 높임
            adjustedSweetness = Math.min(5, sweetness + 1); // 따뜻한 느낌의 단맛 증가
            adjustedSparkling = Math.max(1, sparkling - 1); // 청량감 감소 (묵직한 느낌)
            curationMessage += `날씨가 쌀쌀하여 몸을 따뜻하게 해 줄 높은 도수의 술을 추천합니다.`;
        } else {
            curationMessage += `적당한 날씨로 사용자님의 일반 선호도를 기반으로 추천합니다.`;
        }
    }

    if (weatherData.precipitationTypeDescription === '비' || weatherData.precipitationTypeDescription === '비/눈') {
        adjustedType = "탁주"; // 비 오는 날은 막걸리!
        curationMessage += ` 비가 오니 부침개와 잘 어울리는 탁주를 추천합니다.`;
    } else if (weatherData.skyStatusDescription === '맑음') {
        adjustedSparkling = Math.min(5, sparkling + 2); // 맑은 날 청량감 강조
        curationMessage += ` 맑은 날씨에는 깔끔하고 청량감 있는 술이 좋습니다.`;
    }

    // Recombee 필터 계산
    const filter = `
        'sweetness' >= ${adjustedSweetness - 1.0} and 'sweetness' <= ${adjustedSweetness + 1.0} and
        'sourness' >= ${sourness - 1.0} and 'sourness' <= ${sourness + 1.0} and
        'sparkling' >= ${adjustedSparkling - 1.0} and 'sparkling' <= ${adjustedSparkling + 1.0} and
        'body' >= ${body - 1.0} and 'body' <= ${body + 1.0} and
        'abv' >= ${Math.max(0, adjustedAbv - 5)} and 'abv' <= ${adjustedAbv + 5} and
        'type' == "${adjustedType}" and
        'price' >= ${minPrice} and 'price' <= ${maxPrice}
    `;

    try {
        const result = await client.send(
            new rqs.RecommendItemsToUser(userId, count, {
                filter: filter,
                returnProperties: true,
                cascadeCreate: true, // 사용자나 아이템이 없으면 자동 생성
            })
        );

        return result.recomms.map((item) => ({
            name: item.values.name,
            reason: `${curationMessage} (Recombee 추천: 주류 ${item.values.type}, 가격 ${item.values.price}원, 단맛 ${item.values.sweetness}, 신맛 ${item.values.sourness}, 청량감 ${item.values.sparkling}, 바디감 ${item.values.body}, 도수 ${item.values.abv} 등)`,
        }));
    } catch (error) {
        // Recombee API 오류 발생 시
        console.error("Recombee 추천 실패:", error);
        if (error.response) {
            console.error("Recombee 응답 오류 데이터:", error.response.data);
        }
        // 오류 발생 시 기본 추천 (폴백)
        return [{
            name: "막걸리",
            reason: "현재 날씨 정보와 추천 시스템 연동에 문제가 있어, 기본 추천을 제공합니다. (오류: " + error.message + ")",
        }];
    }
}
