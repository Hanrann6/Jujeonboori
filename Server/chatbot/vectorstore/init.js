import { initEmbedding } from "../service/embedding.service.js";
import dotenv from "dotenv";
dotenv.config();

initEmbedding().then(() => {
  console.log("QDRANT_URL env:", process.env.QDRANT_URL);
  console.log(" 임베딩 초기화 완료");
});
