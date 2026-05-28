import { createStep, createWorkflow } from "@mastra/core/workflows";
import { Agent } from "@mastra/core/agent";
import { z } from "zod";

const documentSchema = z.object({
  author: z.string(),
  content: z.string(),
});

const itemSchema = z.object({
  question: z.string(),
  documents: z.array(documentSchema),
});

function fetchRelevantDocuments(
  question: string,
): z.infer<typeof documentSchema>[] {
  if (question.match(/mastra/i)) {
    return [
      {
        author: "Eric Burel",
        content:
          "Mastra is an agentic framework for JavaScript, built-on top of Vercel AI SDK.",
      },
    ];
  }
  if (question.match(/typescript/i)) {
    return [
      {
        author: "Microsoft",
        content:
          "TypeScript is a strongly typed programming language that builds on JavaScript.",
      },
    ];
  }
  return [];
}

const fetchDocumentsStep = createStep({
  id: "fetch-documents",
  description:
    "Retrieves documents relevant to one question. Runs in parallel for every input question via .foreach().",
  inputSchema: z.string(),
  outputSchema: itemSchema,
  execute: async ({ inputData }) => {
    return { question: inputData, documents: fetchRelevantDocuments(inputData) };
  },
});

const answerAgent = new Agent({
  id: "advanced-workflow-agent",
  name: "Advanced Workflow Agent",
  instructions:
    "You are a concise assistant. Answer each question using ONLY the documents listed under it. If no documents are listed, say briefly that no source was retrieved for this question.",
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

export const advancedWorkflow = createWorkflow({
  id: "advanced-workflow",
  inputSchema: z.array(z.string()),
  outputSchema: z.object({ answer: z.string() }),
})
  .foreach(fetchDocumentsStep)
  .map(async ({ inputData }) => ({ items: inputData }))
  .then(synthesizeStep);

advancedWorkflow.commit();
