import express from "express";
import authController from "../auth/controller/auth.controller";

const router = express.Router();

router.get('/oauth/:provider', authController.getOAuthUrl);
router.post('/oauth/login/:provider', authController.handleOAuthLogin);
router.post('/oauth/reissue', authController.reissueToken);
router.post('/oauth/logout', authController.logout);

export default router;
