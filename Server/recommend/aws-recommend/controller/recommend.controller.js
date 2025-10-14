import { getRecommendations } from "../service/recommend.service.js";

export const recommendController = async (req, res) => {
  try {
    const userId = req.params.userId;
    const recommendations = await getRecommendations(userId);
    res.json({ recommendations });
  } catch (error) {
    res.status(500).json({ message: "추천 실패", error });
  }
};
