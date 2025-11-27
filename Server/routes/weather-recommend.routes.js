// routes/weather-recommend.routes.js
import express from "express";
import { recommendByWeather } from "../recommend/weather-recommend/controller/weather-recommend.controller.js";

const router = express.Router();

// GET /recommend/weather?lat=37.5665&lon=126.9780
router.get("/", recommendByWeather);

export default router;
