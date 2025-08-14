import express from "express";
import authController from "../auth/controller/auth.controller.js";

const router = express.Router();

router.get('/:provider', authController.getOAuthUrl);
router.post('/login/:provider', authController.handleOAuthLogin);
router.post('/reissue', authController.reissueToken);
router.post('/logout', authController.logout);

export default router;
