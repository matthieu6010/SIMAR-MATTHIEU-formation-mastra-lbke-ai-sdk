import { createStep, createWorkflow } from '@mastra/core/workflows';
import { Agent } from '@mastra/core/agent';
import { z } from 'zod';

const echoAgent = new Agent({
  id: 'echo-workflow-agent',
  name: 'Echo Workflow Agent',
  instructions: 'You are a concise assistant. Answer the user question directly and clearly, without preamble.',
  model: 'openrouter/mistralai/codestral-2508',
});

const echoStep = createStep({
  id: 'echo-step',
  description: 'Sends the user question to an LLM and returns its answer.',
  inputSchema: z.object({
    question: z.string().describe('The user question to send to the LLM.'),
  }),
  outputSchema: z.object({
    answer: z.string().describe("The LLM's answer."),
  }),
  execute: async ({ inputData }) => {
    const result = await echoAgent.generate(inputData.question);
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
}).then(echoStep);

echoWorkflow.commit();
