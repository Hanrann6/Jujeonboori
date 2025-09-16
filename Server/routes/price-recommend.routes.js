import express from "express";
import { getAlcoholRecommendations } from "../recommend/price-recommend/controller/price-recommend.controller.js";

const router = express.Router();

// GET /alcohols
router.get("/", getAlcoholRecommendations);

export default router;
