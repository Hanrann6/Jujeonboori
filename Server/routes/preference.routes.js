import { Router } from "express";
import { submitPreference } from "../pref-test/controller/preference.controller.js";

const router = Router();

router.post("/", submitPreference);

export default router;
