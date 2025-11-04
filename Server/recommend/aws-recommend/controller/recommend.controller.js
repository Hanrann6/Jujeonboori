import { getRecommendations } from "../service/recommend.service.js";

export const recommendController = async (req, res) => {
  try {
    const { userId } = req.user;
    const recommendations = await getRecommendations(userId);
    res.status(200).json(recommendations);
  } catch (error) {
    res.status(500).json({ message: "추천 실패", error });
  }
};
