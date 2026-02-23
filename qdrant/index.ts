import { QdrantClient } from "@qdrant/js-client-rest";


export const qdrant_collection_name = "documents";
export const qdrantClient = new QdrantClient({ 
  url: process.env.QDRANT_DB_URL!, 
  apiKey: process.env.QDRANT_DB_KEY });
