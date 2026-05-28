import { MCPClient } from '@mastra/mcp';

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing ${key} environment variable. Add it to your .env file.`);
  }
  return value;
};

const serverPath = requireEnv('GLPI_MCP_SERVER_PATH');

export const glpiMcp = new MCPClient({
  servers: {
    glpi: {
      command: 'node',
      args: [serverPath],
      env: {
        GLPI_API_URL: requireEnv('GLPI_API_URL'),
        GLPI_APP_TOKEN: requireEnv('GLPI_APP_TOKEN'),
        GLPI_USER_TOKEN: requireEnv('GLPI_USER_TOKEN'),
      },
    },
  },
});
