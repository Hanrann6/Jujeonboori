import { initEmbedding } from "../service/embedding.service.js";

initEmbedding().then(() => {
  console.log(" 임베딩 초기화 완료");
});
