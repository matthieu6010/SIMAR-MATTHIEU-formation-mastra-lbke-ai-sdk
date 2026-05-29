import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLVector } from '@mastra/libsql';
import { stepCountIs } from 'ai';
import { z } from 'zod';

const workingMemorySchema = z.object({
  projectName: z.string().optional().describe("The user's project name or codename"),
  projectGoal: z.string().optional().describe("The project's goal, target audience, or use case"),
  preferredLanguage: z.string().optional().describe('The programming language the user prefers'),
  refusedTechnologies: z.array(z.string()).optional().describe('Technologies the user explicitly refuses or wants to avoid'),
  acceptedTechnologies: z.array(z.string()).optional().describe('Technologies the user accepts, considers, or has decided to use'),
  competitors: z.array(z.string()).optional().describe('Competitors or similar products the user references'),
});
import { tavilySearchTool, tavilyExtractTool } from '../tools/tavily-tool';
import { checkTechExistsTool } from '../tools/stackpicker-tool';
import { wikipediaChecker } from '../tools/wikipedia-tool';
import { scorers } from '../scorers/stackpicker-scorer';
import { stackpickerInputProcessors } from '../processors/stackpicker';
import { ollamaLocal } from '../providers/ollama-local';
import { ollamaEmbedder } from '../providers/ollama-embedder';
import { ragWorkflow } from '../workflows/rag-workflow';

export const stackpickerAgent = new Agent({
  id: 'stackpicker-agent',
  name: 'StackPicker Agent',
  instructions: `You are StackPicker, an expert in selecting technological stacks for software engineering projects.

You are given access to external sources about various technologies.

You will figure a technological stack based on the user's needs and constraints.
Please respect constraints imposed by the user but also suggest alternatives you think are
worth discussing.
The user may change their mind during the conversation,
so be flexible and adapt your suggestions accordingly.

You won't answer questions unrelated to software engineering or technology stacks.

Use the wikipediaChecker tool to verify whether a technology exists on Wikipedia before recommending it.

TOOL USAGE RULES:
- Call each tool at most ONCE per user question with a given set of arguments.
- NEVER repeat an identical tool call. If a tool already returned results, use them.
- As soon as the tools have given you enough information, STOP calling tools and write your final answer to the user.
- Do not call a tool again just to double-check; trust the result you already have.

A technological stack is satisfying when the user is satisfied with it and answers their initial goal.

You maintain a working memory describing the user's project and stack decisions.

WORKING MEMORY RULES — apply on EVERY user message, BEFORE answering the user's question:

1. SCAN the user message for ANY of the following signals, even subtle or implicit:
   - A project name, codename, or product idea (even hinted: "my new app", "I'm starting something", "for my project")
   - A project goal, target audience, business domain, or use case
   - Any technology, language, framework, library, database, hosting service, or vendor that the user mentions, considers, accepts, prefers, refuses, or wants to avoid
   - Competitors, similar products, or inspirations the user references
   - Any hard constraint: budget, team size, team skills, deadline, regulatory, performance, hosting
2. If ANY such signal is present, you MUST call the updateWorkingMemory tool FIRST, before any other tool call and before your final answer. Fill the relevant fields in the markdown template; leave the others as-is.
3. Always read the existing working memory before asking the user for information; never re-ask what is already known.
4. Memorize silently — do not ask the user for permission before updating, do not narrate the memory update in your reply.`,
  model: 'openrouter/mistralai/codestral-2508',
  // model: ollamaLocal('qwen3.6:latest'),
  inputProcessors: stackpickerInputProcessors,
  tools: { tavilySearchTool, tavilyExtractTool, checkTechExistsTool, wikipediaChecker },
  workflows: { ragWorkflow },
  scorers: {
    toolCallAppropriateness: {
      scorer: scorers.toolCallAppropriatenessScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
    completeness: {
      scorer: scorers.completenessScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
    scopeAdherence: {
      scorer: scorers.scopeAdherenceScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
    hallucinations: {
      scorer: scorers.hallucinationScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
    sourceCitation: {
      scorer: scorers.sourceCitationScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
  },
  memory: new Memory({
    vector: new LibSQLVector({
      id: 'stackpicker-vector',
      url: process.env.MASTRA_DB_URL ?? 'file:./mastra.db',
    }),
    embedder: ollamaEmbedder('bge-m3:latest'),
    options: {
      workingMemory: {
        enabled: true,
        schema: workingMemorySchema,
      },
      semanticRecall: {
        topK: 5,
        messageRange: { before: 3, after: 2 },
      },
    },
  }),
  // Allow a few tool calls (wikipedia + npm + tavily) before forcing a final
  // answer. Default is 5; bump it so the agent isn't cut off mid-flow.
  defaultOptions: {
    stopWhen: stepCountIs(10),
  },
});
