import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface NpmRegistryResponse {
  'dist-tags': {
    latest: string;
  };
  description: string;
  time: Record<string, string>;
}

export const checkTechExistsTool = createTool({
  id: 'check-tech-exists',
  description:
    'Check whether a given npm package / technology exists, get its latest version and description. Use this to verify a technology before recommending it.',
  inputSchema: z.object({
    techName: z.string().describe('The npm package name to check'),
  }),
  outputSchema: z.object({
    exists: z.boolean(),
    latestVersion: z.string().nullable(),
    description: z.string().nullable(),
    lastPublish: z.string().nullable(),
  }),
  execute: async (inputData) => {
    return await checkTechExists(inputData.techName);
  },
});

const checkTechExists = async (techName: string) => {
  const response = await fetch(
    `https://registry.npmjs.org/${encodeURIComponent(techName)}`,
  );

  if (response.status === 404) {
    return { exists: false, latestVersion: null, description: null, lastPublish: null };
  }

  if (!response.ok) {
    throw new Error(`npm registry returned status ${response.status} for package '${techName}'`);
  }

  const data = (await response.json()) as NpmRegistryResponse;
  const latestVersion = data['dist-tags'].latest;

  return {
    exists: true,
    latestVersion,
    description: data.description ?? null,
    lastPublish: data.time[latestVersion] ?? null,
  };
};
