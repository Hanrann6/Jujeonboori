import { GetRecommendationsCommand } from "@aws-sdk/client-personalize-runtime";
import { personalizeClient } from "../../../config/personalize.js";
import Alcohol from "../../../alcohol/model/alcohol.model.js"
import { attachBookmarkStatus } from "../../../bookmark/service/bookmark.service.js";
// 임시
// S3 선호도 조회 함수
import { getPreferenceCsv } from "../../../pref-test/service/s3.service.js"; 
// 로컬 추천 로직
import { getFilteredRecommendations } from "./recommendTemp.js";

export const getRecommendations = async (userId, numResults = 10) => {
  // const command = new GetRecommendationsCommand({
  //   campaignArn: process.env.CAMPAIGN_ARN,
  //   userId,
  //   numResults,
  // });

  // try {
  //   // Personalize에서 추천 전통주 id 목록 받기
  //   const personalizeResponse = await personalizeClient.send(command);
  //   // 추천 결과가 없으면 빈 배열 반환
  //   if (
  //     !personalizeResponse.itemList ||
  //     personalizeResponse.itemList.length === 0
  //   ) {
  //     return [];
  //   }
  //   // ID만 담긴 배열로 변환
  //   const recommendedItemIds = personalizeResponse.itemList.map(
  //     (item) => item.itemId
  //   );
  //   const indexIds = [];
  //   const objectIds = [];
  //   console.log(recommendedItemIds);

  //   recommendedItemIds.forEach((id) => {
  //     // ID가 숫자 형태인지 확인 (예: "1", "123")
  //     if (/^\d+$/.test(id)) {
  //       indexIds.push(id);
  //     } else {
  //       // 숫자 형태가 아니면 _id로 간주
  //       objectIds.push(id);
  //     }
  //   });
  //   // ID 목록으로 MongoDB에서 아이템 상세 정보 조회
  //   const itemDetailsFromDB = await Alcohol.find({
  //     $or: [{ index: { $in: indexIds } }, { _id: { $in: objectIds } }],
  //   });
  //   // Personalize 추천 순서대로 결과 재정렬 및 포맷 변경
  //   const orderedAndFormattedResults = recommendedItemIds
  //     .map((id) => {
  //       // DB에서 조회한 결과 중 현재 ID와 일치하는 아이템 찾기
  //       const itemDetail = itemDetailsFromDB.find((item) =>
  //         // 현재 ID가 숫자형인지 문자열형인지에 따라 다른 필드와 비교
  //         /^\d+$/.test(id) ? item.index == id : item._id.toString() === id
  //       );

  //       // 만약 DB에 해당 아이템이 없으면 null 반환 (데이터 불일치 예외 처리)
  //       if (!itemDetail) return null;

  //       // 원하는 최종 출력 형식으로 객체 생성
  //       return {
  //         alcoholId: itemDetail.index,
  //         name: itemDetail.alcoholName, // DB 필드명 alcoholName -> 출력 필드명 name
  //         degree: itemDetail.degree,
  //         priceValue: itemDetail.priceValue,
  //         alcoholType: itemDetail.alcoholType,
  //         imageUrl: itemDetail.imageUrl,
  //       };
  //     })
  //     .filter((item) => item !== null); // null인 경우 최종 결과에서 제외

  //   // 북마크 서비스 호출
  //   const resultsWithBookmarks = await attachBookmarkStatus(
  //     userId,
  //     orderedAndFormattedResults
  //   );

  //   return resultsWithBookmarks;
    
  // } catch (error) {
  //   console.error("추천을 받아오는 중 에러가 발생", error);
  //   throw error;
  // }

  // 임시 추천 코드
  try {
    // S3에서 유저 선호도 가져오기
    const userPref = await getPreferenceCsv(userId);

    // 2. 분리한 파일에서 추천 리스트 받아오기 (CSV 로딩도 거기서 알아서 함)
    const recommendedItems = await getFilteredRecommendations(
      userPref,
      numResults
    );

    // 3. 북마크 여부 붙이기
    const resultsWithBookmarks = await attachBookmarkStatus(
      userId,
      recommendedItems
    );

    return resultsWithBookmarks;
  } catch (error) {
    console.error("추천 로직 에러:", error);
    return [];
  }
};
