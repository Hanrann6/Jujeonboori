import express from "express";
import {
  recommendController,
  getLogsController,
} from "../chatbot/controller/chatbot.controller.js";

const router = express.Router();
router.post("/recommend", recommendController); // 질문
router.get("/logs/:userId", getLogsController);   // 대화 기록 조회

export default router;
