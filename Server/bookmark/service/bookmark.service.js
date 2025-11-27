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
    select: "index alcoholName degree priceValue alcoholType imageUrl",
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
        priceValue: alcoholId.priceValue,
        alcoholType: alcoholId.alcoholType,
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


// 특정 전통주의 북마크 여부 반환
export const attachBookmarkStatus = async (userId, alcoholList) => {
  // 주류 리스트가 비어있으면 DB 조회 없이 빈 배열 반환
  if (!userId || !alcoholList || alcoholList.length === 0) {
    return alcoholList || [];
  }

  // 주류 리스트에서 index값 목록을 추출
  const alcoholIndexes = alcoholList.map((a) => a.alcoholId);

  // index로 DB에서 Alcohol의 실제 '_id' 조회
  const alcoholDocs = await Alcohol.find({
    index: { $in: alcoholIndexes },
  })
    .select("_id index")
    .lean();

  // index -> MongoDB _id 맵 생성
  const indexToMongoIdMap = new Map(
    alcoholDocs.map((doc) => [doc.index, doc._id.toString()])
  );

  // MongoDB _id 목록으로 Bookmark 조회
  const alcoholMongoIds = Array.from(indexToMongoIdMap.values());

  // userId가 있는 경우에만 북마크 조회
  let bookmarkedIdSet = new Set(); // 기본값
  if (userId) {
    const userBookmarks = await Bookmark.find({
      userId: userId,
      alcoholId: { $in: alcoholMongoIds },
    })
      .select("alcoholId")
      .lean();


    // 북마크된 MongoDB _id 목록을 Set으로 생성
    bookmarkedIdSet = new Set(userBookmarks.map((b) => b.alcoholId.toString()));
  }

  // 원본 리스트(alcoholList)에 isBookmarked 필드 추가
  return alcoholList.map((alcohol) => {
    // 현재 alcohol의 index(alcoholId)로 MongoDB _id 찾기
    const mongoId = indexToMongoIdMap.get(alcohol.alcoholId);

    // 해당 _id가 북마크 Set에 있는지 확인
    const isBookmarked = mongoId ? bookmarkedIdSet.has(mongoId) : false;

    return {
      ...alcohol, // 원본 alcohol 객체
      isBookmarked: isBookmarked,
    };
  });
};