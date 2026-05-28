import { createStep, createWorkflow } from '@mastra/core/workflows';
import { Agent } from '@mastra/core/agent';
import { z } from 'zod';

const documentSchema = z.object({
  author: z.string(),
  content: z.string(),
});

function fetchRelevantDocuments(question: string): z.infer<typeof documentSchema>[] {
  if (question.match(/mastra/i)) {
    return [
      {
        author: 'Eric Burel',
        content: 'Mastra is an agentic framework for JavaScript, built-on top of Vercel AI SDK.',
      },
    ];
  }
  return [];
}

const fetchDocumentsStep = createStep({
  id: 'fetch-documents',
  description: 'Simulates a retrieval step that returns documents relevant to the user question.',
  inputSchema: z.object({
    question: z.string(),
  }),
  outputSchema: z.object({
    question: z.string(),
    documents: z.array(documentSchema),
  }),
  execute: async ({ inputData }) => {
    return {
      question: inputData.question,
      documents: fetchRelevantDocuments(inputData.question),
    };
  },
});

const echoAgent = new Agent({
  id: 'echo-workflow-agent',
  name: 'Echo Workflow Agent',
  instructions: `You are a concise assistant. Answer the user question directly, using ONLY the provided documents when they are present. If no documents are provided, answer from your general knowledge but say briefly that no source was retrieved.`,
  model: 'openrouter/mistralai/codestral-2508',
});

const generateAnswerStep = createStep({
  id: 'generate-answer',
  description: 'Sends the user question and the retrieved documents to the LLM and returns the answer.',
  inputSchema: z.object({
    question: z.string(),
    documents: z.array(documentSchema),
  }),
  outputSchema: z.object({
    answer: z.string(),
  }),
  execute: async ({ inputData }) => {
    const docsBlock = inputData.documents.length
      ? inputData.documents
          .map((d, i) => `Document ${i + 1} (by ${d.author}):\n${d.content}`)
          .join('\n\n')
      : '(no documents retrieved)';

    const prompt = `Documents:
${docsBlock}

Question: ${inputData.question}`;

    const result = await echoAgent.generate(prompt);
    return { answer: result.text };
  },
});

export const echoWorkflow = createWorkflow({
  id: 'echo-workflow',
  inputSchema: z.object({
    question: z.string(),
  }),
  outputSchema: z.object({
    answer: z.string(),
  }),
})
  .then(fetchDocumentsStep)
  .then(generateAnswerStep);

echoWorkflow.commit();
