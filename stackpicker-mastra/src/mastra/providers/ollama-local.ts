import type { OpenAICompatibleConfig } from '@mastra/core/llm';

// Do NOT throw at module load: that would crash the whole server at boot
// (e.g. on Mastra Cloud where the local Ollama host is not reachable).
// Fall back to localhost and only warn; agents using this provider will
// simply fail at call time instead of blocking startup.
const url = process.env.OLLAMA_LOCAL_URL;
if (!url) {
  console.warn(
    '[ollama-local] OLLAMA_LOCAL_URL is not set, falling back to http://localhost:11434/v1. Local Ollama agents will not work until it is configured.',
  );
}

export const OLLAMA_LOCAL_URL = url ?? 'http://localhost:11434/v1';

export const ollamaLocal = (model: string): OpenAICompatibleConfig => ({
  id: `ollama-local/${model}`,
  url: OLLAMA_LOCAL_URL,
});
