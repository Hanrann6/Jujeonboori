import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
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

// stream -> string
async function streamToString(stream) {
  return await new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

// S3에 선호도 결과 컬럼을 추가
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

// 선호도 결과 조회
export async function getPreferenceCsv(userId) {
  const key = "users.csv";

  try {
    const obj = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME2,
        Key: key,
      })
    );
    const csv = await streamToString(obj.Body);

    // 각 줄 = 유저 데이터
    const rows = csv.trim().split("\n");

    // userId 찾기
    const line = rows.find((row) => row.startsWith(userId + ","));
    if (!line) return null;

    const [id, sweetness, sourness, carbonation, body, refreshing, abv] =
      line.split(",");

    return {
      sweetness: parseFloat(sweetness),
      sourness: parseFloat(sourness),
      carbonation: parseFloat(carbonation),
      body: parseFloat(body),
      refreshing: parseFloat(refreshing),
      abv: parseFloat(abv),
    };
  } catch (err) {
    console.error("getPreferenceCsv error:", err);
    return null;
  }
}


// 회원 탈퇴 시 선호도 결과(유저 정보) 삭제
export async function deletePreferenceCsv(userId) {
  const key = "users.csv";
  const BUCKET_NAME = process.env.S3_BUCKET_NAME2;

  let existingCsv = "";
  try {
    // 기존 users.csv 가져오기
    const obj = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );
    existingCsv = await streamToString(obj.Body);
  } catch (err) {
    if (err.name === "NoSuchKey") {
      // 파일이 없으면 성공 처리
      console.log(
        "users.csv 파일이 이미 존재하지 않습니다."
      );
      return;
    }
    console.error("users.csv 읽기 오류:", err);
    throw err; // 다른 종류의 에러
  }

  // CSV 파싱 및 해당 userId 필터링
  const rows = existingCsv.trim().split("\n");

  let userFound = false;
  const updatedRows = rows.filter((row) => {
    // userId로 시작하는 row를 찾음
    if (row.startsWith(userId + ",")) {
      userFound = true;
      return false;
    }
    return true;
  });

  // 해당 유저의 데이터가 원래 없었다면
  if (!userFound) {
    console.log(`users.csv에 ${userId}의 데이터가 없어 삭제를 스킵합니다.`);
    return;
  }

  // 필터링된 row를 다시 string으로 합치기
  const updatedCsv = updatedRows.join("\n");

  // S3에 덮어쓰기
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: updatedCsv,
        ContentType: "text/csv",
      })
    );
    console.log(`users.csv에서 ${userId}의 선호도 정보 삭제`);
  } catch (putErr) {
    console.error("필터링된 users.csv를 S3에 덮어쓰는 중 오류:", putErr);
    throw putErr; // 상위 로직에 에러 전파
  }
}