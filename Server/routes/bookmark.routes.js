import express from "express";
import {
  addBookmark,
  getBookmarksByUser,
  deleteBookmark,
} from "../bookmark/controller/bookmark.controller.js";

const router = express.Router();

router.post("/", addBookmark);
router.get("/:userId", getBookmarksByUser);
router.delete("/", deleteBookmark);

export default router;
