import express from "express";
import { recommendController } from "../recommend/aws-recommend/controller/recommend.controller.js";
import priceRecommendRoutes from "./price-recommend.routes.js";
import weatherRecommendRouter from "./weather-recommend.routes.js";

const router = express.Router();

router.use("/price", priceRecommendRoutes);
router.use("/weather", weatherRecommendRouter);
router.get("/:userId", recommendController);

export default router;
