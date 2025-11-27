import express from "express";
import authMiddleware from "../auth/middleware/auth.middleware.js";
import {
  recommendController,
  getLogsController,
} from "../chatbot/controller/chatbot.controller.js";

const router = express.Router();
router.post("/recommend", authMiddleware.verifyAccessToken, recommendController); // 챗봇 질문
router.get("/logs", authMiddleware.verifyAccessToken, getLogsController);   // 챗봇 대화 기록 조회

export default router;
