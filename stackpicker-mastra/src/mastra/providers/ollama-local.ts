import type { OpenAICompatibleConfig } from '@mastra/core/llm';

const url = process.env.OLLAMA_LOCAL_URL;
if (!url) {
  throw new Error(
    'OLLAMA_LOCAL_URL is not set. Add it to your .env file (e.g. OLLAMA_LOCAL_URL=http://your-ollama-host:11434/v1).',
  );
}

export const OLLAMA_LOCAL_URL = url;

export const ollamaLocal = (model: string): OpenAICompatibleConfig => ({
  id: `ollama-local/${model}`,
  url: OLLAMA_LOCAL_URL,
});
