import { getAlcoholsUnderPrice } from "../service/price-recommend.service.js";

export function getAlcoholRecommendations(req, res) {
  try {
    const { price } = req.query; // ?price=20000 이런 식
    const maxPrice = price ? Number(price) : 30000;
    const result = getAlcoholsUnderPrice(maxPrice, 6);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to get alcohol recommendations" });
  }
}
