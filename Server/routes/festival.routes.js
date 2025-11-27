import express from 'express';
import festivalController from '../festival/controller/festival.controller.js';
import authMiddleware from '../auth/middleware/auth.middleware.js';

const router = express.Router();

// 축제 목록 조회
router.get('/',
    authMiddleware.verifyAccessToken,
    festivalController.getFestivals
);

export default router;