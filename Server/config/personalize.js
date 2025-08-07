import dotenv from "dotenv";
import { PersonalizeRuntimeClient } from "@aws-sdk/client-personalize-runtime";

dotenv.config();

export const personalizeClient = new PersonalizeRuntimeClient({
  region: "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
