import { createStep, createWorkflow } from "@mastra/core/workflows";
import { Agent } from "@mastra/core/agent";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { embed } from "ai";
import { z } from "zod";
import { getChromaClient, RAG_COLLECTION_NAME } from "../rag/chroma";

// Same embedding model as the ingestion workflow — required so query vectors
// live in the same space as the stored ones.
const embeddingModel = openrouter.textEmbeddingModel("mistralai/mistral-embed-2312");

const documentSchema = z.object({
  content: z.string(),
  source: z.string(),
});

const itemSchema = z.object({
  question: z.string(),
  documents: z.array(documentSchema),
});

// Retrieval: embed the question, then fetch the closest chunks from Chroma.
async function fetchRelevantDocuments(
  question: string,
): Promise<z.infer<typeof documentSchema>[]> {
  const { embedding } = await embed({ model: embeddingModel, value: question });

  const client = getChromaClient();
  let collection;
  try {
    collection = await client.getCollection({ name: RAG_COLLECTION_NAME });
  } catch {
    // Collection not ingested yet — nothing to retrieve.
    return [];
  }

  const result = await collection.query({
    queryEmbeddings: [embedding],
    nResults: 3,
  });

  const docs = result.documents?.[0] ?? [];
  const metas = result.metadatas?.[0] ?? [];

  return docs
    .map((content, i) => {
      const url = metas[i]?.url;
      return {
        content: content ?? "",
        source: typeof url === "string" ? url : "unknown",
      };
    })
    .filter((d) => d.content.length > 0);
}

const fetchDocumentsStep = createStep({
  id: "fetch-documents",
  description:
    "Retrieves the most relevant chunks from Chroma for one question. Runs in parallel for every input question via .foreach().",
  inputSchema: z.string(),
  outputSchema: itemSchema,
  execute: async ({ inputData }) => {
    return {
      question: inputData,
      documents: await fetchRelevantDocuments(inputData),
    };
  },
});

const answerAgent = new Agent({
  id: "rag-workflow-agent",
  name: "RAG Workflow Agent",
  instructions:
    "You are a concise assistant. Answer each question using ONLY the documents listed under it. If no documents are listed, say briefly that no source was retrieved for this question. Cite the source URL when relevant.",
  model: "openrouter/mistralai/codestral-2508",
});

const synthesizeStep = createStep({
  id: "synthesize-answers",
  description: "Synthesizes answers from all retrieved documents.",
  inputSchema: z.object({ items: z.array(itemSchema) }),
  outputSchema: z.object({ answer: z.string() }),
  execute: async ({ inputData }) => {
    const prompt = `Answer each question using the provided documents. If a question has no documents, say briefly that no source was retrieved for that question.

${JSON.stringify(inputData.items, null, 2)}`;

    const { text } = await answerAgent.generate(prompt);
    return { answer: text };
  },
});

export const ragWorkflow = createWorkflow({
  id: "rag-workflow",
  description:
    "Answers questions using the ingested Mastra documentation (RAG): retrieves the most relevant documentation chunks from Chroma and synthesizes an answer. Input is an array of questions.",
  inputSchema: z.array(z.string()),
  outputSchema: z.object({ answer: z.string() }),
})
  .foreach(fetchDocumentsStep)
  .map(async ({ inputData }) => ({ items: inputData }))
  .then(synthesizeStep);

ragWorkflow.commit();
