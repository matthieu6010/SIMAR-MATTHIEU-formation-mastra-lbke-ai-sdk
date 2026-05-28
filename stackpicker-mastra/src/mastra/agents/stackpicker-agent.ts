import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { tavilySearchTool, tavilyExtractTool } from '../tools/tavily-tool';
import { checkTechExistsTool } from '../tools/stackpicker-tool';
import { wikipediaChecker } from '../tools/wikipedia-tool';
import { scorers } from '../scorers/stackpicker-scorer';

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

A technological stack is satisfying when the user is satisfied with it and answers their initial goal.`,
  model: 'openrouter/mistralai/codestral-2508',
  tools: { tavilySearchTool, tavilyExtractTool, checkTechExistsTool, wikipediaChecker },
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
  },
  memory: new Memory(),
});
