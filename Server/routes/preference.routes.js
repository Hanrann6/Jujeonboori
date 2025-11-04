import { Router } from "express";
import authMiddleware from "../auth/middleware/auth.middleware.js";
import { getPreference, submitPreference } from "../pref-test/controller/preference.controller.js";

const router = Router();

router.post("/", authMiddleware.verifyAccessToken, submitPreference); // 선호도 저장
router.get("/", authMiddleware.verifyAccessToken, getPreference); // 선호도 조회

export default router;
