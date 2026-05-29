import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Normalize a label for comparison: lowercase, drop a trailing
// "(disambiguation suffix)" and surrounding whitespace.
const normalize = (s: string): string =>
  s
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();

export const wikipediaChecker = createTool({
  id: 'wikipedia-checker',
  description:
    'Check whether a technology has its own Wikipedia article. Returns existsOnWikipedia and the matched article title.',
  inputSchema: z.object({
    technology: z
      .string()
      .max(100)
      .describe('The name of the technology to check on Wikipedia.'),
  }),
  outputSchema: z.object({
    existsOnWikipedia: z.boolean(),
    matchedTitle: z.string().nullable(),
  }),
  execute: async (inputData, context) => {
    console.log('Request context:', context?.requestContext);

    // Search (tolerant to casing/suffixes), then validate the TOP result's
    // title actually matches the requested term. A pure full-text search is
    // too permissive: searching "Mastra" returns homonyms like "George
    // Mastras", which must NOT count as the technology existing.
    const url =
      `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=1&srsearch=` +
      encodeURIComponent(inputData.technology);

    const response = await fetch(url, {
      headers: { 'User-Agent': 'stackpicker-mastra/1.0 (educational project)' },
    });

    if (!response.ok) {
      console.error(`Wikipedia API error: ${response.statusText}`);
      return { existsOnWikipedia: false, matchedTitle: null };
    }

    const data = (await response.json()) as {
      query?: { search?: { title: string }[] };
    };

    const topTitle = data.query?.search?.[0]?.title ?? null;
    if (!topTitle) {
      return { existsOnWikipedia: false, matchedTitle: null };
    }

    const term = normalize(inputData.technology);
    const title = normalize(topTitle);
    const matches = title === term || title.startsWith(term) || term.startsWith(title);

    return {
      existsOnWikipedia: matches,
      matchedTitle: matches ? topTitle : null,
    };
  },
});
