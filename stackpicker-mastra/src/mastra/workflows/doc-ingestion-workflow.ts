import { createStep, createWorkflow } from "@mastra/core/workflows";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";

// OpenRouter embedding model (reads OPENROUTER_API_KEY from env).
const embeddingModel = openrouter.textEmbeddingModel("mistralai/mistral-embed-2312");
import { load } from "cheerio";
import TurndownService from "turndown";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getChromaClient, RAG_COLLECTION_NAME } from "../rag/chroma";

const chunkSchema = z.object({
  text: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// --- Step 1: download a web page and convert it to markdown ----------------
const ingestDocument = createStep({
  id: "ingest-document",
  description:
    "Downloads a web page and converts its main content to markdown.",
  inputSchema: z.object({
    url: z.string().url(),
  }),
  outputSchema: z.object({
    url: z.string(),
    markdown: z.string(),
  }),
  execute: async ({ inputData }) => {
    const response = await fetch(inputData.url, {
      headers: { "User-Agent": "stackpicker-mastra/1.0 (educational project)" },
    });
    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${inputData.url}: ${response.status} ${response.statusText}`,
      );
    }
    const html = await response.text();

    // Isolate the main content (drop nav/footer/sidebar) before conversion.
    const $ = load(html);
    const main =
      $("main").html() ?? $("article").html() ?? $("body").html() ?? html;

    const turndown = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
    });
    turndown.remove(["script", "style", "noscript"]);
    const markdown = turndown.turndown(main);

    return { url: inputData.url, markdown };
  },
});

// --- Step 2: chunk the markdown (semantic-markdown strategy) ----------------
const chunkStep = createStep({
  id: "chunk-document",
  description: "Splits the markdown into semantically coherent chunks.",
  inputSchema: z.object({
    url: z.string(),
    markdown: z.string(),
  }),
  outputSchema: z.object({
    url: z.string(),
    chunks: z.array(chunkSchema),
  }),
  execute: async ({ inputData }) => {
    const doc = MDocument.fromMarkdown(inputData.markdown);
    const chunks = await doc.chunk({
      strategy: "semantic-markdown",
      joinThreshold: 500,
    });
    return {
      url: inputData.url,
      chunks: chunks.map((c) => ({ text: c.text, metadata: c.metadata })),
    };
  },
});

// --- Step 3: embed the chunks and store them in Chroma ---------------------
const embedAndStoreStep = createStep({
  id: "embed-and-store",
  description:
    "Computes embeddings for each chunk and ingests them into Chroma.",
  inputSchema: z.object({
    url: z.string(),
    chunks: z.array(chunkSchema),
  }),
  outputSchema: z.object({
    url: z.string(),
    chunksCount: z.number(),
  }),
  execute: async ({ inputData }) => {
    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: inputData.chunks.map((c) => c.text),
    });

    const client = getChromaClient();
    // Reset the collection so re-ingesting the same URL doesn't duplicate.
    try {
      await client.deleteCollection({ name: RAG_COLLECTION_NAME });
    } catch {
      // Collection didn't exist yet — fine.
    }
    const collection = await client.getOrCreateCollection({
      name: RAG_COLLECTION_NAME,
      embeddingFunction: null, // we supply our own (mistral-embed) vectors
    });

    await collection.add({
      ids: inputData.chunks.map(() => nanoid()),
      embeddings,
      documents: inputData.chunks.map((c) => c.text),
      metadatas: inputData.chunks.map((c) => ({
        url: inputData.url,
        ...(c.metadata ?? {}),
      })),
    });

    return { url: inputData.url, chunksCount: inputData.chunks.length };
  },
});

export const docIngestionWorkflow = createWorkflow({
  id: "doc-ingestion",
  inputSchema: z.object({
    url: z.string().url(),
  }),
  outputSchema: z.object({
    url: z.string(),
    chunksCount: z.number(),
  }),
})
  .then(ingestDocument)
  .then(chunkStep)
  .then(embedAndStoreStep);

docIngestionWorkflow.commit();
