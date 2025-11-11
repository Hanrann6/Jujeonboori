import User from "../../user/model/user.model.js";
import Alcohol from "../../alcohol/model/alcohol.model.js";
import Bookmark from "../model/bookmark.model.js";
import {
  sendBookmarkEvent
} from "../../personalize/service/personalize.service.js";

// 북마크 로직
export const bookmark = async (userId, alcoholIndex) => {
  const user = await User.findById(userId);
  const alcohol = await Alcohol.findOne({ index: alcoholIndex });

  if (!user || !alcohol) {
    throw new Error("유효하지 않은 유저 또는 전통주입니다.");
  }

  // 중복 체크
  const exists = await Bookmark.findOne({ userId, alcoholId: alcohol._id });
  if (exists) {
    // 에러를 throw
    throw new Error("이미 북마크된 전통주입니다.");
  }

  // db에는 _id로 저장
  const newBookmark = new Bookmark({ userId, alcoholId: alcohol._id });
  await newBookmark.save();

  // Personalize에 이벤트 전송
  await sendBookmarkEvent(userId, alcohol.index.toString());

  //생성된 newBookmark 객체 return
  return newBookmark;
};


// 북마크 목록 조회 로직
export const getBookmarks = async(userId) => {
  const bookmarks = await Bookmark.find({ userId }).populate({
    path: "alcoholId",
    select: "index alcoholName degree imageUrl",
  });

  // 데이터 가공
  const results = bookmarks
    .map((bookmark) => {
      // alcoholId가 없는 경우
      if (!bookmark.alcoholId) {
        return null;
      }

      const { alcoholId } = bookmark;

      return {
        // alcohol의 index를 alcoholIndex로
        alcoholIndex: alcoholId.index,
        alcoholName: alcoholId.alcoholName,
        degree: alcoholId.degree,
        imageUrl: alcoholId.imageUrl,
      };
    })
    .filter((item) => item !== null);

  // 결과 반환
  return results;
}


// 북마크 삭제 로직
export const removeBookmark = async (userId, alcoholIndex) => {
  // alcoholIndex로 alcohol._id를 찾기
  const alcohol = await Alcohol.findOne({ index: alcoholIndex });

  // alcohol이 없으면 에러 처리
  if (!alcohol) {
    throw new Error("북마크가 존재하지 않습니다."); // 404 Not Found
  }

  // userId와 찾은 alcoholId로 북마크를 찾아 삭제
  const deleted = await Bookmark.findOneAndDelete({
    userId,
    alcoholId: alcohol._id,
  });

  // 북마크가 없으면 에러
  if (!deleted) {
    throw new Error("북마크가 존재하지 않습니다."); // 404 Not Found
  }

  // 성공
  return deleted;
};