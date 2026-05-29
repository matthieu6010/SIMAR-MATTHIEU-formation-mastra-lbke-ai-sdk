import { MCPClient } from '@mastra/mcp';

// All required env vars must be present to spawn the local MCP server.
// If any is missing (e.g. on Mastra Cloud), we export `null` instead of
// throwing, so the server can still boot without the GLPI agent.
const serverPath = process.env.GLPI_MCP_SERVER_PATH;
const apiUrl = process.env.GLPI_API_URL;
const appToken = process.env.GLPI_APP_TOKEN;
const userToken = process.env.GLPI_USER_TOKEN;

const isConfigured = Boolean(serverPath && apiUrl && appToken && userToken);

if (!isConfigured) {
  console.warn(
    '[glpi-mcp] GLPI env vars are not fully set; the GLPI MCP client is disabled. Set GLPI_MCP_SERVER_PATH, GLPI_API_URL, GLPI_APP_TOKEN and GLPI_USER_TOKEN to enable it.',
  );
}

export const glpiMcp = isConfigured
  ? new MCPClient({
      servers: {
        glpi: {
          command: 'node',
          args: [serverPath!],
          env: {
            GLPI_API_URL: apiUrl!,
            GLPI_APP_TOKEN: appToken!,
            GLPI_USER_TOKEN: userToken!,
          },
        },
      },
    })
  : null;
