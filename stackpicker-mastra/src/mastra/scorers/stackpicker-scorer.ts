import { z } from 'zod';
import { createToolCallAccuracyScorerCode } from '@mastra/evals/scorers/prebuilt';
import { createCompletenessScorer } from '@mastra/evals/scorers/prebuilt';
import { getAssistantMessageFromRunOutput, getUserMessageFromRunInput } from '@mastra/evals/scorers/utils';
import { createScorer } from '@mastra/core/evals';

export const toolCallAppropriatenessScorer = createToolCallAccuracyScorerCode({
  expectedTool: 'check-tech-exists',
  strictMode: false,
});

export const completenessScorer = createCompletenessScorer();

export const scopeAdherenceScorer = createScorer({
  id: 'scope-adherence-scorer',
  name: 'Scope Adherence',
  description: 'Checks that the agent refuses off-topic questions and answers on-topic software engineering / tech stack questions',
  type: 'agent',
  judge: {
    model: 'openai/gpt-5-mini',
    instructions:
      'You are an expert evaluator of AI assistant behavior. ' +
      'Determine whether a user question is related to software engineering or technology stacks, ' +
      'and whether the assistant responded appropriately: answering on-topic questions and refusing off-topic ones. ' +
      'Return only the structured JSON matching the provided schema.',
  },
})
  .preprocess(({ run }) => {
    const userText = getUserMessageFromRunInput(run.input) || '';
    const assistantText = getAssistantMessageFromRunOutput(run.output) || '';
    return { userText, assistantText };
  })
  .analyze({
    description: 'Determine if the question is on-topic and whether the agent responded appropriately',
    outputSchema: z.object({
      onTopic: z.boolean(),
      respondedAppropriately: z.boolean(),
      reasoning: z.string(),
    }),
    createPrompt: ({ results }) => `
You are evaluating whether a StackPicker assistant correctly handled the scope of a user question.
The assistant should answer questions related to software engineering or technology stacks, and refuse all others.

User question:
"""
${results.preprocessStepResult.userText}
"""

Assistant response:
"""
${results.preprocessStepResult.assistantText}
"""

Tasks:
1) Determine if the user question is related to software engineering or technology stacks.
2) Check whether the assistant responded appropriately: answered if on-topic, refused if off-topic.

Return JSON with fields:
{
  "onTopic": boolean,
  "respondedAppropriately": boolean,
  "reasoning": string
}
    `,
  })
  .generateScore(({ results }) => {
    const r = (results as any)?.analyzeStepResult || {};
    return r.respondedAppropriately ? 1.0 : 0.0;
  })
  .generateReason(({ results, score }) => {
    const r = (results as any)?.analyzeStepResult || {};
    return `Scope adherence: onTopic=${r.onTopic ?? false}, respondedAppropriately=${r.respondedAppropriately ?? false}. Score=${score}. ${r.reasoning ?? ''}`;
  });

export const scorers = {
  toolCallAppropriatenessScorer,
  completenessScorer,
  scopeAdherenceScorer,
};
