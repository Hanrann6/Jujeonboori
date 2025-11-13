import fs from "fs";
import csv from "csv-parser";
import path from "path";
import { fileURLToPath } from "url";
import { attachBookmarkStatus } from "../../../bookmark/service/bookmark.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.resolve(__dirname, "../../data/sool.csv"); 
// service.js 위치 기준으로 data 폴더 찾아감

let alcohols = [];

// 서버 시작 시 CSV 로딩
export function loadAlcoholData() {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        // price, degree 숫자로 변환
        row.priceValue = Number(row.priceValue);
        row.degree = Number(row.degree);
        results.push(row);
      })
      .on("end", () => {
        alcohols = results;
        resolve();
      })
      .on("error", (err) => reject(err));
  });
}

// 조건에 맞는 전통주 랜덤 10개 반환
export async function getAlcoholsUnderPrice(userId, limitPrice = 30000, count = 10) {
  const filtered = alcohols.filter((a) => a.priceValue <= limitPrice);
  // Fisher-Yates shuffle 후 count 개수 추출
  for (let i = filtered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
  }

  // DB 조회 전 기본 정보만 맵핑 (isBookmarked 없음)
  const randomAlcohols = filtered.slice(0, count).map((a) => ({
    alcoholId: a.index,
    name: a.alcoholName,
    degree: a.degree,
    alcoholType: a.alcoholType,
    imageUrl: a.imageUrl,
  }));

  // 북마크 서비스 호출 -> isBookmarked
  const resultsWithBookmarks = await attachBookmarkStatus(
    userId,
    randomAlcohols
  );

  return resultsWithBookmarks;
}

export function getAlcoholsData() {
  return alcohols;
}