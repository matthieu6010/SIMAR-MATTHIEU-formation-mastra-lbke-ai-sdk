import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const wikipediaChecker = createTool({
  id: 'wikipedia-checker',
  description: 'Check if a technology does exist on Wikipedia',
  inputSchema: z.object({
    technology: z
      .string()
      .max(100)
      .describe('The name of the technology to check on Wikipedia.'),
  }),
  execute: async (inputData, context) => {
    console.log('Request context:', context?.requestContext);
    const response = await fetch(`https://en.wikipedia.org/wiki/${inputData.technology}`);
    if (!response.ok) {
      console.error(`Wikipedia API error: ${response.statusText}`);
      return false;
    }
    return true;
  },
});
