import {
  PersonalizeEventsClient,
  PutEventsCommand,
} from "@aws-sdk/client-personalize-events";
import dotenv from "dotenv";

dotenv.config();

const personalizeEventsClient = new PersonalizeEventsClient({
  region: "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
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
