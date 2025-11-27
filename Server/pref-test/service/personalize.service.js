import dotenv from "dotenv";
dotenv.config(); // .env 파일 로드

import {
  PersonalizeEventsClient,
  PutUsersCommand,
  PutEventsCommand,
} from "@aws-sdk/client-personalize-events";

const pe = new PersonalizeEventsClient({
  region: process.env.AWS_REGION2,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID2,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY2,
  },
});

export async function upsertUserToPersonalize(userId, pref) {
  const properties = JSON.stringify(pref);
  await pe.send(
    new PutUsersCommand({
      datasetArn: process.env.PERSONALIZE_USERS_DATASET_ARN,
      users: [{ userId, properties }],
    })
  );
}

export async function logPreferenceEvent(userId, pref, sessionId) {
  await pe.send(
    new PutEventsCommand({
      trackingId: process.env.TRACKING_ID,
      userId,
      sessionId: sessionId || userId,
      eventList: [
        {
          eventType: "SUBMIT_PREFERENCES",
          sentAt: new Date(),
          properties: JSON.stringify(pref),
        },
      ],
    })
  );
}
