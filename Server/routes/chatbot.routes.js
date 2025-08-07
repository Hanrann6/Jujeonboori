import express from "express";
import { recommendController } from "../controllers/chatbot.controller.js";

const router = express.Router();
router.post("/recommend", recommendController);

export default router;
