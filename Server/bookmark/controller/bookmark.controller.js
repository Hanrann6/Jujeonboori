import {
  bookmark,
  getBookmarks,
  removeBookmark,
} from "../service/bookmark.service.js";


// 북마크 추가
export const addBookmark = async (req, res) => {
  const { userId } = req.user;
  if (!userId) return res.status(400).json({ message: "user가 필요합니다." });

  const { alcoholIndex } = req.body;

  try {
    const newBookmark = await bookmark(userId, alcoholIndex);

    // 서비스가 반환한 newBookmark 객체를 응답으로
    res.status(201).json({ message: "북마크 완료", bookmark: newBookmark });
  } catch (err) {
    if (err.message === "유효하지 않은 유저 또는 전통주입니다.") {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === "이미 북마크된 전통주입니다.") {
      return res.status(400).json({ message: err.message }); // 또는 409 Conflict
    }

    // 서버 에러
    res.status(500).json({ message: "북마크 실패", error: err.message });
  }
};


// 북마크 목록 조회
export const getBookmarksByUser = async (req, res) => {
  try {
    const { userId } = req.user;

    // 서비스 호출
    const results = await getBookmarks(userId);

    // 성공 응답
    res.json(results);
  } catch (err) {
    // 에러 처리
    res.status(500).json({ message: "조회 실패", error: err.message });
  }
};


// 북마크 삭제
export const deleteBookmark = async (req, res) => {
  try {
    const { userId } = req.user;
    const { alcoholIndex } = req.body;

    // 서비스 로직 호출
    await removeBookmark(userId, alcoholIndex);

    // 성공 응답
    res.json({ message: "북마크 삭제 완료" });
  } catch (err) {
    // 서비스 throw new Error()
    if (err.message === "북마크가 존재하지 않습니다.") {
      // 404 Not Found
      return res.status(404).json({ message: err.message });
    }

    // 서버 에러
    res.status(500).json({ message: "삭제 실패", error: err.message });
  }
};
