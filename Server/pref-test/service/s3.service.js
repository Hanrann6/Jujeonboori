import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import dotenv from "dotenv";
dotenv.config(); // .env 파일 로드

const s3 = new S3Client({
  region: process.env.AWS_REGION2,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID2,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY2,
  },
});

function toCsvRow(userId, p) {
  return `${userId},${p.sweetness},${p.sourness},${p.carbonation},${p.body},${p.refreshing},${p.abv}\n`;
}

// Helper: stream → string
async function streamToString(stream) {
  return await new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

export async function putPreferenceCsv(userId, pref) {
  const key = "users.csv"; // 항상 같은 파일

  let existing = "";
  try {
    // 기존 users.csv 가져오기
    const obj = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME2,
        Key: key,
      })
    );
    existing = await streamToString(obj.Body);
  } catch (err) {
    console.log("기존 users.csv 없음 → 새로 생성합니다.");
  }

  // 새 유저 row 추가
  const newRow = toCsvRow(userId, pref);
  const updated = existing + newRow;

  // 덮어쓰기
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME2,
      Key: key,
      Body: updated,
      ContentType: "text/csv",
    })
  );

  return { key };
}
