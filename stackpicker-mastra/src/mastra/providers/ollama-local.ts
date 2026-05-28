import type { OpenAICompatibleConfig } from '@mastra/core/llm';

const OLLAMA_LOCAL_URL = 'http://your-ollama-host:11434/v1';

export const ollamaLocal = (model: string): OpenAICompatibleConfig => ({
  id: `ollama-local/${model}`,
  url: OLLAMA_LOCAL_URL,
});
