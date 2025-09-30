import { QdrantClient } from "@qdrant/js-client-rest";

export const qdrant = new QdrantClient({ url: "http://qdrant:6333" });
export const COLLECTION_NAME = "sool_collection";
