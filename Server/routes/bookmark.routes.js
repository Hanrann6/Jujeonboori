import express from "express";
import authMiddleware from "../auth/middleware/auth.middleware.js";
import {
  addBookmark,
  getBookmarksByUser,
  deleteBookmark,
} from "../bookmark/controller/bookmark.controller.js";

const router = express.Router();

router.post("/",authMiddleware.verifyAccessToken, addBookmark);
router.get("/",authMiddleware.verifyAccessToken, getBookmarksByUser);
router.delete("/",authMiddleware.verifyAccessToken, deleteBookmark);

export default router;
