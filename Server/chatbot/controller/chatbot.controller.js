//import { recommendSool } from "../service/chatbot.service.js";
import { recommendSool } from "../service/langchain.service.js";
import { getChatLogs } from "../service/chatbot.service.js";

export async function recommendController(req, res) {
  const { userId } = req.user;
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: "질문이 필요합니다." });

  try {
    const result = await recommendSool(userId, question);
    res.json({ result });
  } catch (e) {
    console.error("오류 발생:", e);
    res.status(500).json({ error: "추천 실패" });
  }
}

export async function getLogsController(req, res) {
  const { userId } = req.user;
  if (!userId) return res.status(400).json({ error: "userId 필요" });

  try {
    const logs = await getChatLogs(userId);
    res.json({ logs });
  } catch (e) {
    console.error("조회 에러:", e);
    res.status(500).json({ error: "조회 실패" });
  }
}