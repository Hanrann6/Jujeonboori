import express from "express";
import { recommendController } from "../recommend/aws-recommend/controller/recommend.controller.js";
import priceRecommendRoutes from "./price-recommend.routes.js";
import weatherRecommendRouter from "./weather-recommend.routes.js";
import authMiddleware from "../auth/middleware/auth.middleware.js";

const router = express.Router();

router.use("/price", authMiddleware.verifyAccessToken, priceRecommendRoutes);
router.use(
  "/weather",
  authMiddleware.verifyAccessToken,
  weatherRecommendRouter
);
router.get("/",  authMiddleware.verifyAccessToken, recommendController);

export default router;
