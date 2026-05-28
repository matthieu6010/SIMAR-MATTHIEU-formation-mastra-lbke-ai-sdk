import { ModelRouterEmbeddingModel } from '@mastra/core/llm';
import { OLLAMA_LOCAL_URL } from './ollama-local';

export const ollamaEmbedder = (model: string) =>
  new ModelRouterEmbeddingModel({
    providerId: 'ollama',
    modelId: model,
    url: OLLAMA_LOCAL_URL,
    apiKey: 'not-needed',
  });
