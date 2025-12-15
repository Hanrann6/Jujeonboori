// src/recommend/utils/localRecommend.js
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { fileURLToPath } from "url";

// 1. 경로 설정 (프로젝트 구조에 맞춰 수정 필요)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// 예: 현재 폴더에서 상위로 가서 recommend/data/sool.csv를 찾는 경우
const csvPath = path.resolve(__dirname, "../../data/sool.csv");

// 2. 데이터를 메모리에 캐싱할 변수 (매번 파일 읽지 않도록)
let cachedAlcohols = [];

// [내부 함수] CSV 파일 읽기
const loadCsvData = () => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => {
        // 숫자 변환 및 필수 데이터 가공
        row.index = Number(row.index);
        row.priceValue = Number(row.priceValue);
        row.degree = Number(row.degree);
        row.sweetness = Number(row.sweetness || 3);
        row.sourness = Number(row.sourness || 3);
        row.carbonation = Number(row.carbonation || 3);
        row.body = Number(row.body || 3);
        results.push(row);
      })
      .on("end", () => {
        cachedAlcohols = results; // 캐싱
        resolve(results);
      })
      .on("error", (err) => reject(err));
  });
};

// [Export 메인 함수] 선호도 기반 추천 (데이터 없으면 로딩부터 함)
export const getFilteredRecommendations = async (userPref, numResults = 10) => {
  // 1. 데이터가 메모리에 없으면 로딩
  if (cachedAlcohols.length === 0) {
    try {
      await loadCsvData();
    } catch (error) {
      console.error("CSV 로딩 실패:", error);
      return [];
    }
  }

  let sortedAlcohols = [];
  const allAlcohols = cachedAlcohols;

  // 2-A. 선호도 없음 (설문 X) -> 랜덤 추천
  if (!userPref) {
    sortedAlcohols = [...allAlcohols];
    // Fisher-Yates Shuffle
    for (let i = sortedAlcohols.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sortedAlcohols[i], sortedAlcohols[j]] = [
        sortedAlcohols[j],
        sortedAlcohols[i],
      ];
    }
  }
  // 2-B. 선호도 있음 -> 유사도 계산
  else {
    const scoredAlcohols = allAlcohols.map((item) => {
      let score = 0;
      // 점수 차이 합산 (낮을수록 좋음)
      score += Math.abs(userPref.sweetness - item.sweetness);
      score += Math.abs(userPref.sourness - item.sourness);
      score += Math.abs(userPref.carbonation - item.carbonation);
      score += Math.abs(userPref.body - item.body);
      score += Math.abs(userPref.abv - item.degree);

      return { ...item, _similarityScore: score };
    });

    // 점수 오름차순 정렬
    sortedAlcohols = scoredAlcohols.sort(
      (a, b) => a._similarityScore - b._similarityScore
    );
  }

  // 3. 포맷팅해서 반환
  return sortedAlcohols.slice(0, numResults).map((item) => ({
    alcoholId: item.index,
    name: item.alcoholName,
    degree: item.degree,
    priceValue: item.priceValue,
    alcoholType: item.alcoholType,
    imageUrl: item.imageUrl,
  }));
};
