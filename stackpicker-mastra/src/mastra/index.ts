
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { DuckDBStore } from "@mastra/duckdb";
import { MastraCompositeStore } from '@mastra/core/storage';
import { Observability, MastraStorageExporter, MastraPlatformExporter, SensitiveDataFilter } from '@mastra/observability';
import { LangfuseExporter } from '@mastra/langfuse';
import { weatherWorkflow } from './workflows/weather-workflow';
import { echoWorkflow } from './workflows/echo-workflow';
import { advancedWorkflow } from './workflows/advanced-workflow';
import { docIngestionWorkflow } from './workflows/doc-ingestion-workflow';
import { weatherAgent } from './agents/weather-agent';
import { stackpickerAgent } from './agents/stackpicker-agent';
import { summarizerAgent } from './agents/summarizer-agent';
import { glpiAgent } from './agents/glpi-agent';
import { paidUserMiddleware } from './middlewares/paid-user';
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';

export const mastra = new Mastra({
  workflows: { weatherWorkflow, echoWorkflow, advancedWorkflow, docIngestionWorkflow },
  agents: { weatherAgent, stackpickerAgent, summarizerAgent, glpiAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  server: {
    middleware: [paidUserMiddleware],
  },
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new LibSQLStore({
      id: "mastra-storage",
      url: process.env.MASTRA_DB_URL ?? "file:./mastra.db",
    }),
    domains: {
      observability: await new DuckDBStore().getStore('observability'),
    }
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new MastraStorageExporter(), // Persists observability events to Mastra Storage (powers the local Studio)
          new MastraPlatformExporter(), // Sends observability events to Mastra Platform (if MASTRA_PLATFORM_ACCESS_TOKEN is set)
          // External tracer: only enabled when Langfuse credentials are present,
          // so the server boots fine without them.
          ...(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY
            ? [
                new LangfuseExporter({
                  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
                  secretKey: process.env.LANGFUSE_SECRET_KEY,
                  baseUrl: process.env.LANGFUSE_BASE_URL,
                  realtime: process.env.NODE_ENV !== 'production',
                }),
              ]
            : []),
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});
