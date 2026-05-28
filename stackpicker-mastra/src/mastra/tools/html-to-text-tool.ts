import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

const htmlToPlainText = (html: string): string => {
  let out = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/(h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  for (const [entity, char] of Object.entries(ENTITIES)) {
    out = out.split(entity).join(char);
  }

  out = out.replace(/&#(\d+);/g, (_match, dec: string) => String.fromCharCode(Number(dec)));

  return out.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
};

export const htmlToTextTool = createTool({
  id: 'html-to-text',
  description: 'Convert an HTML document or fragment into clean plain text, stripping tags, scripts and styles.',
  inputSchema: z.object({
    html: z.string().describe('The HTML source to convert into plain text.'),
  }),
  outputSchema: z.object({
    text: z.string(),
  }),
  execute: async (inputData) => {
    return { text: htmlToPlainText(inputData.html) };
  },
});
