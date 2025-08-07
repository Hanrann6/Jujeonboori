import { QdrantClient } from "@qdrant/js-client-rest";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/community/vectorstores/qdrant";
import { loadCSVData, buildSoolText } from "../utils/csvLoader.js";
import dotenv from "dotenv";
dotenv.config();

const COLLECTION_NAME = "sool_collection";
const client = new QdrantClient({ url: "http://localhost:6333" });

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-small",
});

export async function initEmbedding() {
  const data = await loadCSVData("alcohol_crawl/merged_traditional_alcohol.csv");

  await client.deleteCollection(COLLECTION_NAME).catch(() => {});
  await client.createCollection(COLLECTION_NAME, {
    vectors: {
      size: 1536,
      distance: "Cosine",
    },
  });

  const texts = data.map(buildSoolText);
  const metadatas = data;

  await QdrantVectorStore.fromTexts(texts, metadatas, embeddings, {
    client,
    collectionName: COLLECTION_NAME,
  });

  console.log("Qdrant 임베딩 완료");
}
