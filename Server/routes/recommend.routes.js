import express from "express";
import { recommendController } from "../recommend/aws-recommend/controller/recommend.controller.js";

const router = express.Router();

router.get("/:userId", recommendController);

export default router;
