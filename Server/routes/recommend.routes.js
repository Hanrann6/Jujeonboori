import express from "express";
import { recommendController } from "../recommend/aws-recommend/controller/recommend.controller.js";
import priceRecommendRoutes from "./price-recommend.routes.js";
import weatherRecommendRouter from "./weather-recommend.routes.js";
import authMiddleware from "../auth/middleware/auth.middleware.js";

const router = express.Router();

router.use("/price", priceRecommendRoutes);
router.use("/weather", weatherRecommendRouter);
router.get("/",  authMiddleware.verifyAccessToken, recommendController);

export default router;
