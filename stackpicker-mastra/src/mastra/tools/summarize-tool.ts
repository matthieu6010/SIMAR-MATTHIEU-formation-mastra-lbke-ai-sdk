import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { OLLAMA_LOCAL_URL } from '../providers/ollama-local';

const SUMMARIZE_MODEL = 'mistral-small3.2:latest';

interface OllamaChatCompletion {
  choices: { message: { content: string } }[];
}

export const summarizeTool = createTool({
  id: 'summarize-text',
  description:
    'Summarize a given text in approximately N lines using the local mistral-small model. Use this once the input is plain text (not HTML).',
  inputSchema: z.object({
    text: z.string().min(1).describe('The plain text to summarize.'),
    approximateLines: z
      .number()
      .int()
      .min(1)
      .max(50)
      .describe('Approximate number of lines for the summary.'),
  }),
  outputSchema: z.object({
    summary: z.string(),
  }),
  execute: async (inputData) => {
    const response = await fetch(`${OLLAMA_LOCAL_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: SUMMARIZE_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a precise summarizer. Produce a faithful summary in the same language as the source text. Keep concrete facts and figures.',
          },
          {
            role: 'user',
            content: `Summarize the following text in approximately ${inputData.approximateLines} line${
              inputData.approximateLines > 1 ? 's' : ''
            }. Reply with the summary only.\n\n${inputData.text}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama summarize call failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OllamaChatCompletion;
    const summary = data.choices?.[0]?.message?.content?.trim() ?? '';

    return { summary };
  },
});
