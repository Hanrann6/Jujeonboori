import { QdrantClient } from "@qdrant/js-client-rest";
import { QdrantVectorStore } from "@langchain/community/vectorstores/qdrant";
import { loadCSVData, buildSoolText } from "../utils/csvLoader.js";
import dotenv from "dotenv";
import path from "path";
//dotenv.config(); // 배포용 env
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") }); // 로컬용 env

import { pipeline } from "@xenova/transformers";

const COLLECTION_NAME = "sool_collection";
const QDRANT_URL = process.env.QDRANT_URL; // local에서 사용 시 localhost로 변경

// 로컬 임베딩 (MiniLM 모델 사용)
let embedder;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return embedder;
}

async function embedTexts(texts) {
  const extractor = await getEmbedder();
  const embeddings = [];

  for (const text of texts) {
    const output = await extractor(text, { pooling: "mean", normalize: true });
    embeddings.push(Array.from(output.data));
  }

  return embeddings;
}

// util 함수: 데이터를 batch로 나누기
function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

function cleanPayload(obj) {
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) {
      cleaned[key] = "";
    } else if (!isNaN(value) && value !== "") {
      cleaned[key] = Number(value); // 숫자로 변환
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// fetch로 Qdrant 업로드
async function upsertBatch(points) {
  const response = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ points }),
  });
  return await response.json();
}

// ec2 init용 csv 경로
const csvPath = process.env.QDRANT_INIT_CSV_PATH;

export async function initEmbedding() {
  const data = await loadCSVData(csvPath);
  console.log("QDRANT_URL env:", process.env.QDRANT_URL);

  // 기존 컬렉션 삭제 및 새로 생성
  await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
    method: "DELETE",
  }).catch(() => {});
  await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vectors: { size: 384, distance: "Cosine" },
    }),
  });

  const texts = data.map(buildSoolText);
  const metadatas = data;

  // 로컬 임베딩 실행
  const vectors = await embedTexts(texts);

  // 포인트 준비 (id는 1부터 시작)
  const points = vectors.map((vec, i) => ({
    id: i + 1, // 숫자 ID
    vector: vec,
    payload: cleanPayload(metadatas[i]),
  }));

  console.log("첫 payload:", metadatas[0]);

  // 배치 업로드 (예: 10개씩)
  const batches = chunkArray(points, 1);

  for (let i = 0; i < vectors.length; i++) {
    const safePoint = {
      id: i + 1,
      vector: vectors[i],
      payload: {
        index: metadatas[i].index,
        alcoholName: metadatas[i].alcoholName,
        foodPairing: metadatas[i].foodPairing,
        sweetness: metadatas[i].sweetness,
        sourness: metadatas[i].sourness,
        freshness: metadatas[i].freshness,
        body: metadatas[i].body,
        degree: metadatas[i].degree,
        sparkling: metadatas[i].sparkling,
        alcoholType: metadatas[i].alcoholType,
        keyword: metadatas[i].keyword,
        volume: metadatas[i].volume,
        price: metadatas[i].price,
        imageURL: metadatas[i].imageUrl,
      },
    };

    console.log(
      "업로드 JSON 크기(byte):",
      Buffer.byteLength(JSON.stringify({ points: [safePoint] }))
    );

    try {
      const res = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: [safePoint] }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`업로드 실패 id=${safePoint.id}`, res.status, text);
    break;
  }

  console.log(`업로드 완료 id=${safePoint.id}`);

  
  
} catch (err) {
  console.error("에러 id=", safePoint.id, err);
}

await new Promise((r) => setTimeout(r, 200));

    
  }

  console.log("Qdrant 임베딩 완료 ");
}