// controllers/weather-recommend.controller.js
import { getAlcoholsByWeather } from "../service/weather-recommend.service.js";

export async function recommendByWeather(req, res) {
  try {
    // temperature, precipitationType을 받음
    const { temperature, precipitationType } = req.query;

    // 파라미터 유효성 검사
    if (temperature === undefined || precipitationType === undefined) {
      return res
        .status(400)
        .json({
          error: "temperature, precipitationType 쿼리 파라미터가 필요합니다.",
        });
    }

    // 온도는 숫자로 변환
    const temp = parseFloat(temperature);

    if (isNaN(temp)) {
      return res
        .status(400)
        .json({ error: "temperature는 유효한 숫자여야 합니다." });
    }

    // precipitationType은 문자열 0 또는 1로 그대로 전달
    const result = await getAlcoholsByWeather(temp, precipitationType);

    return res.json(result);
  } catch (error) {
    console.error("날씨 기반 추천 오류:", error);
    return res
      .status(500)
      .json({ error: "날씨 기반 추천 중 오류가 발생했습니다." });
  }
}
