import Bookmark from "../model/bookmark.model.js";
import User from "../../user/model/user.model.js";
import Alcohol from "../../alcohol/model/alcohol.model.js";
import { sendBookmarkEvent } from "../../personalize/service/personalize.service.js";



// 북마크 추가
export const addBookmark = async (req, res) => {
  const { userId, alcoholId } = req.body;

  try {
    const user = await User.findById(userId);
    const alcohol = await Alcohol.findById(alcoholId);

    if (!user || !alcohol) {
      return res
        .status(404)
        .json({ message: "유효하지 않은 유저 또는 전통주입니다." });
    }

    // 중복 체크
    const exists = await Bookmark.findOne({ userId, alcoholId });
    if (exists) {
      return res.status(400).json({ message: "이미 북마크된 전통주입니다." });
    }

    const bookmark = new Bookmark({ userId, alcoholId });
    await bookmark.save();

    // Personalize에 이벤트 전송
    await sendBookmarkEvent(userId, alcoholId.toString());

    res.status(201).json({ message: "북마크 완료", bookmark });
  } catch (err) {
    res.status(500).json({ message: "북마크 실패", error: err.message });
  }
};

// 북마크 목록 조회
export const getBookmarksByUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const bookmarks = await Bookmark.find({ userId }).populate("alcoholId");
    res.json(bookmarks);
  } catch (err) {
    res.status(500).json({ message: "조회 실패", error: err.message });
  }
};

// 북마크 삭제
export const deleteBookmark = async (req, res) => {
  const { userId, alcoholId } = req.body;

  try {
    const deleted = await Bookmark.findOneAndDelete({ userId, alcoholId });
    if (!deleted) {
      return res.status(404).json({ message: "북마크가 존재하지 않습니다." });
    }
    res.json({ message: "북마크 삭제 완료" });
  } catch (err) {
    res.status(500).json({ message: "삭제 실패", error: err.message });
  }
};
