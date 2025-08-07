import express from "express";
import fs from "fs";
import csv from "csv-parser";
import * as recombee from "recombee-api-client";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
const rqs = recombee.requests;

const app = express();
const PORT = 3000;

// Recombee 클라이언트 설정
const client = new recombee.ApiClient(process.env.RECOMBEE_DB, process.env.RECOMBEE_PRIVATE_TOKEN, {
  region: "eu-west",
  timeout: 10000,
});

// 전통주 데이터 업로드 함수
async function uploadSoolDataFromCSV(csvFilePath) {
  return new Promise((resolve, reject) => {
    const tasks = [];

    fs.createReadStream(csvFilePath, { encoding: "utf-8" })
      .pipe(csv())
      .on("data", (row) => {
        const itemId = `test-${row.index}`;

        const itemValues = {
          name: row["제품명"],
          sweetness: parseFloat(row["단맛"]) || 0,
          sourness: parseFloat(row["신맛"]) || 0,
          sparkling: parseFloat(row["청량감"]) || 0,
          body: parseFloat(row["바디감"]) || 0,
          abv: parseFloat(row["도수%"]) || 0,
          carbonation: parseFloat(row["탄산"]) || 0,
          type: row["주종"] || "기타",
          price: parseInt(row["가격"]) || 0,
        };

        const uploadTask = client
          .send(new rqs.AddItem(itemId))
          .catch((err) => {
            if (!err.message?.includes("already exists")) throw err;
          })
          .then(() =>
            client
              .send(new rqs.SetItemValues(itemId, itemValues))
              .then(() => console.log(`${itemId} 값 설정 완료`))
              .catch((err) =>
                console.error(`${itemId} SetItemValues 실패:`, err.message)
              )
          );

        tasks.push(uploadTask);
      })
      .on("end", async () => {
        try {
          await Promise.all(tasks);
          console.log("전체 CSV 항목 업로드 완료");
          resolve();
        } catch (err) {
          console.error("전체 업로드 실패:", err);
          reject(err);
        }
      })
      .on("error", (err) => reject(err));
  });
}

// 서버 시작 전 CSV 업로드
(async () => {
  try {
    // await uploadSoolDataFromCSV("../liquor_crawl/merged_traditional_alcohol_data.csv");
    await uploadSoolDataFromCSV("../alcohol_crawl/sorted_traditional_alcohol.csv");
    app.listen(PORT, () =>
      console.log(`서버 실행됨: http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("서버 시작 실패:", err);
  }
})();
