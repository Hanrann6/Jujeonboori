import fs from "fs";
import csv from "csv-parser";

export async function loadCSVData(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => results.push(row))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

export function buildSoolText(row) {
  return `
이름: ${row["제품명"]}
주종: ${row["주종"] || "정보 없음"}
도수: ${row["도수%"] || "정보 없음"}%
탄산: ${row["탄산"] === "1" ? "있음" : "없음"}
단맛: ${row["단맛"]}, 신맛: ${row["신맛"]}, 청량감: ${row["청량감"]}, 바디감: ${
    row["바디감"]
  }
키워드: ${row["keyword"]}
어울리는 음식: ${row["어울리는음식"]}
원재료: ${row["원재료"]}
설명: ${row["detail"] || ""}
`.trim();
}
