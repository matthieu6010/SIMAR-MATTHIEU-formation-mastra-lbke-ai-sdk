import { ChromaClient } from 'chromadb';

// Singleton ChromaClient: created once and reused across workflow steps.
// Defaults to the local Chroma server (http://localhost:8000) started with
// `chroma run --path ./chroma-data`.
let client: ChromaClient | null = null;

export const getChromaClient = (): ChromaClient => {
  if (!client) {
    client = new ChromaClient();
  }
  return client;
};

export const RAG_COLLECTION_NAME = 'documentation_mastra';
