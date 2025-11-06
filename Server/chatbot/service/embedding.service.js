import { QdrantClient } from "@qdrant/js-client-rest";
import { QdrantVectorStore } from "@langchain/community/vectorstores/qdrant";
import { loadCSVData, buildSoolText } from "../utils/csvLoader.js";
import dotenv from "dotenv";
import path from "path";
import { pipeline } from "@xenova/transformers";
import { Embeddings } from "@langchain/core/embeddings";
import { Document } from "@langchain/core/documents";
dotenv.config(); // 배포용 env
//dotenv.config({ path: path.resolve(process.cwd(), "../../.env") }); // 로컬용 env

const COLLECTION_NAME = "sool_collection";
const QDRANT_URL = process.env.QDRANT_URL; // local에서 사용 시 localhost로 변경

let embedderInstance;
class XenovaEmbeddings extends Embeddings {
  constructor() {
    super({});
  }
  async getEmbedder() {
    if (!embedderInstance) {
      embedderInstance = await pipeline(
        "feature-extraction",
        "Xenova/paraphrase-multilingual-mpnet-base-v2"
      );
    }
    return embedderInstance;
  }
  async embedQuery(text) {
    const extractor = await this.getEmbedder();
    const output = await extractor(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  }
  async embedDocuments(texts) {
    const extractor = await this.getEmbedder();
    const outputs = [];
    for (const text of texts) {
      const output = await extractor(text, {
        pooling: "mean",
        normalize: true,
      });
      outputs.push(Array.from(output.data));
    }
    return outputs;
  }
}


// // util 함수: 데이터를 batch로 나누기
// function chunkArray(array, size) {
//   const result = [];
//   for (let i = 0; i < array.length; i += size) {
//     result.push(array.slice(i, i + size));
//   }
//   return result;
// }

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

// // fetch로 Qdrant 업로드
// async function upsertBatch(points) {
//   const response = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points`, {
//     method: "PUT",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ points }),
//   });
//   return await response.json();
// }

// ec2 init용 csv 경로
const csvPath = process.env.QDRANT_INIT_CSV_PATH;

export async function initEmbedding() {
  const data = await loadCSVData(csvPath);
  console.log("QDRANT_URL env:", QDRANT_URL);

  const client = new QdrantClient({ url: QDRANT_URL });
  const embeddings = new XenovaEmbeddings(); // 임베딩은 랭체인 방식 사용

  // 컬렉션 삭제 및 생성
  await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
    method: "DELETE",
  }).catch(() => {});
  console.log("기존 컬렉션 삭제 완료.");

  await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vectors: { size: 768, distance: "Cosine" },
    }),
  });
  console.log("새 컬렉션 생성 완료.");

  // 랭체인 Document 객체로 변환
  const documents = data.map((row) => {
    const cleanedData = cleanPayload(row);
    return new Document({
      pageContent: buildSoolText(cleanedData),
      metadata: cleanedData, // metadata를 payload에 저장할 것
    });
  });

  console.log(
    `${documents.length}개의 문서를 Qdrant에 저장합니다...`
  );

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];

    // 수동으로 텍스트 임베딩
    const vector = await embeddings.embedQuery(doc.pageContent);

    // Qdrant 포인트 생성
    // payload에 랭체인이 사용할 doc.metadata를 저장
    const safePoint = {
      id: i + 1, // 단순 숫자 ID
      vector: vector,
      payload: doc.metadata, // 랭체인이 검색할 수 있도록 metadata를 payload로 저장
    };

    // fetch로 1개씩 업로드
    try {
      const res = await fetch(
        `${QDRANT_URL}/collections/${COLLECTION_NAME}/points`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ points: [safePoint] }), // 1개씩 보냄
        }
      );

      if (!res.ok) {
        const text = await res.text();
        console.error(`업로드 실패 id=${safePoint.id}`, res.status, text);
        break; // 실패 시 중단
      }

      // 50개마다 진행 상황 출력
      if ((i + 1) % 50 === 0) {
        console.log(`업로드 중... ${i + 1} / ${documents.length}`);
      }
    } catch (err) {
      console.error(`Fetch 에러 id=${safePoint.id}`, err);
      break; // 네트워크 에러 시 중단
    }
  }

  console.log("Qdrant 임베딩 완료");
}