import { Router } from "express";
import { getPreference, submitPreference } from "../pref-test/controller/preference.controller.js";

const router = Router();

router.post("/", submitPreference); // 저장
router.get("/", getPreference); // 조회

export default router;
