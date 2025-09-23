import { recommendSool } from "../service/chatbot.service.js";

export async function recommendController(req, res) {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: "질문이 필요합니다." });

  try {
    const result = await recommendSool(question);
    res.json({ result });
  } catch (e) {
    console.error("오류 발생:", e);
    res.status(500).json({ error: "추천 실패" });
  }
}
