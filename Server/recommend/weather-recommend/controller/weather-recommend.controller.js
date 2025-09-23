// controllers/weather-recommend.controller.js
import { getAlcoholsByWeather } from "../service/weather-recommend.service.js";

export async function recommendByWeather(req, res) {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res
        .status(400)
        .json({ error: "lat, lon 쿼리 파라미터가 필요합니다." });
    }

    const result = await getAlcoholsByWeather(lat, lon);

    return res.json(result);
  } catch (error) {
    console.error("날씨 기반 추천 오류:", error);
    return res
      .status(500)
      .json({ error: "날씨 기반 추천 중 오류가 발생했습니다." });
  }
}
