import express from "express";
import multer from "multer";
import { handleOcrUpload } from "../ocr/controller/ocr.controller.js";

const router = express.Router();

// Multer 설정
const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("image"), handleOcrUpload);

export default router;
