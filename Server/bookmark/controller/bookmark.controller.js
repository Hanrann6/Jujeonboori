import Bookmark from "../model/bookmark.model.js";
import User from "../../user/model/user.model.js";
import Alcohol from "../../alcohol/model/alcohol.model.js";
import {
  sendBookmarkEvent
} from "../../personalize/service/personalize.service.js";



// 북마크 추가
export const addBookmark = async (req, res) => {

  const { userId } = req.user;
  if (!userId) return res.status(400).json({ message: "user가 필요합니다." });

  const { alcoholIndex } = req.body;

  try {
    const user = await User.findById(userId);
    // findById 대신 findOne으로 index 필드 검색
    const alcohol = await Alcohol.findOne({ index: alcoholIndex });

    if (!user || !alcohol) {
      return res
        .status(404)
        .json({ message: "유효하지 않은 유저 또는 전통주입니다." });
    }

    // 중복 체크
    const exists = await Bookmark.findOne({ userId, alcoholId: alcohol._id });
    if (exists) {
      return res.status(400).json({ message: "이미 북마크된 전통주입니다." });
    }

    // db에는 _id로 저장
    const bookmark = new Bookmark({ userId, alcoholId: alcohol._id });
    await bookmark.save();

    // Personalize에 이벤트 전송
    await sendBookmarkEvent(userId, alcohol.index.toString());

    res.status(201).json({ message: "북마크 완료", bookmark });
  } catch (err) {
    res.status(500).json({ message: "북마크 실패", error: err.message });
  }
};

// 북마크 목록 조회
export const getBookmarksByUser = async (req, res) => {
  const { userId } = req.user;

  try {
    const bookmarks = await Bookmark.find({ userId }).populate({
      path: "alcoholId",
      select: "index alcoholName degree imageUrl",
    });

    const results = bookmarks
      .map((bookmark) => {
        // populate된 alcoholId가 없는 경우(DB에서 삭제된 경우 등)를 대비
        if (!bookmark.alcoholId) {
          return null;
        }

        const { alcoholId } = bookmark;

        return {
          // alcohol의 index를 alcoholId로 명명
          alcoholIndex: alcoholId.index,
          alcoholName: alcoholId.alcoholName,
          degree: alcoholId.degree,
          imageUrl: alcoholId.imageUrl,
        };
      })
      .filter((item) => item !== null);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: "조회 실패", error: err.message });
  }
};

// 북마크 삭제
export const deleteBookmark = async (req, res) => {
  const { userId } = req.user;
  const { alcoholIndex } = req.body;

  try {
    const alcohol = await Alcohol.findOne({ index: alcoholIndex });
    const deleted = await Bookmark.findOneAndDelete({
      userId,
      alcoholId: alcohol._id,
    });
    if (!deleted) {
      return res.status(404).json({ message: "북마크가 존재하지 않습니다." });
    }
    res.json({ message: "북마크 삭제 완료" });
  } catch (err) {
    res.status(500).json({ message: "삭제 실패", error: err.message });
  }
};
