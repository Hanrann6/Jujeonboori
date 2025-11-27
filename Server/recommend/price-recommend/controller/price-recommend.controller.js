import { getAlcoholsUnderPrice } from "../service/price-recommend.service.js";

export async function getAlcoholRecommendations(req, res) {
  try {
    const { userId } = req.user;
    const { price } = req.query; // ?price=20000 이런 식
    const maxPrice = price ? Number(price) : 30000;
    const result = await getAlcoholsUnderPrice(userId, maxPrice, 10);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to get alcohol recommendations" });
  }
}
