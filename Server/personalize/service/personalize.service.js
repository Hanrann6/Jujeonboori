import {
  PersonalizeEventsClient,
  PutEventsCommand,
} from "@aws-sdk/client-personalize-events";
import dotenv from "dotenv";

dotenv.config();

const personalizeEventsClient = new PersonalizeEventsClient({
  region: "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID2,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY2,
  },
});

export const sendBookmarkEvent = async (userId, itemId) => {
  const command = new PutEventsCommand({
    trackingId: process.env.TRACKING_ID,
    userId,
    sessionId: `bookmark-${userId}`, // 세션은 적당히 정함
    eventList: [
      {
        eventType: "bookmark",
        sentAt: new Date(),
        itemId,
      },
    ],
  });

  try {
    const result = await personalizeEventsClient.send(command);
    console.log("이벤트 전송 성공:", result);
  } catch (err) {
    console.error("이벤트 전송 실패:", err.message);
  }
};

// 상세 페이지 조회 이벤트 전송
export const sendViewDetailEvent = async (userId, itemId) => {
  const command = new PutEventsCommand({
    trackingId: process.env.TRACKING_ID,
    userId,
    sessionId: `view-${userId}`, // 다른 세션으로 구분
    eventList: [
      {
        eventType: "view_detail", // Personalize에서 이 eventType을 정의해줘야 함
        sentAt: new Date(),
        itemId,
      },
    ],
  });

  try {
    const result = await personalizeEventsClient.send(command);
    console.log("상세 보기 이벤트 전송 성공:", result);
  } catch (err) {
    console.error("상세 보기 이벤트 전송 실패:", err.message);
  }
};

// 리뷰 작성 이벤트 전송
export const sendReviewEvent = async (userId, itemId, rating) => {
  const command = new PutEventsCommand({
    trackingId: process.env.TRACKING_ID,
    userId,
    sessionId: `review-${userId}`,
    eventList: [
      {
        eventType: "review",
        sentAt: new Date(),
        itemId,
        properties: JSON.stringify({ rating }), // 점수 같은 부가정보
      },
    ],
  });

  try {
    const result = await personalizeEventsClient.send(command);
    console.log("리뷰 이벤트 전송 성공:", result);
  } catch (err) {
    console.error("리뷰 이벤트 전송 실패:", err.message);
  }
};
