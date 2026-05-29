import { z } from 'zod';
import { createToolCallAccuracyScorerCode } from '@mastra/evals/scorers/prebuilt';
import { createCompletenessScorer } from '@mastra/evals/scorers/prebuilt';
import { createHallucinationScorer } from '@mastra/evals/scorers/prebuilt';
import { getAssistantMessageFromRunOutput, getUserMessageFromRunInput, extractToolResults, isScorerRunOutputForAgent } from '@mastra/evals/scorers/utils';
import { createScorer } from '@mastra/core/evals';

export const toolCallAppropriatenessScorer = createToolCallAccuracyScorerCode({
  expectedTool: 'check-tech-exists',
  strictMode: false,
});

export const completenessScorer = createCompletenessScorer();

// Prebuilt LLM-judged scorer: detects hallucinations (0 = no hallucination).
// Without a context, every factual claim is treated as unsupported and the
// score is always 1. We feed the agent's tool results as the grounding
// context so claims backed by a tool (e.g. the npm version) score 0.
export const hallucinationScorer = createHallucinationScorer({
  model: 'openrouter/mistralai/mistral-nemo',
  options: {
    getContext: ({ run }) => {
      if (!isScorerRunOutputForAgent(run.output)) return [];
      const toolResults = extractToolResults(run.output);
      return toolResults.map((t) =>
        JSON.stringify({ tool: t.toolName, result: t.result }),
      );
    },
  },
});

export const scopeAdherenceScorer = createScorer({
  id: 'scope-adherence-scorer',
  name: 'Scope Adherence',
  description: 'Checks that the agent refuses off-topic questions and answers on-topic software engineering / tech stack questions',
  type: 'agent',
  judge: {
    model: 'openrouter/openai/gpt-5-mini',
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

// Custom LLM-as-a-judge scorer: checks that the agent grounds its answer in
// the sources returned by its RAG/search tools (Tavily, Wikipedia, npm)
// instead of fabricating. If no source was retrieved, the answer is not
// penalized (nothing to cite).
export const sourceCitationScorer = createScorer({
  id: 'source-citation-scorer',
  name: 'Source Citation',
  description: 'Checks whether the assistant grounds its answer in the sources retrieved by its tools rather than fabricating.',
  type: 'agent',
  judge: {
    model: 'openrouter/openai/gpt-5-mini',
    instructions:
      'You are an expert evaluator of RAG groundedness. ' +
      'Determine whether an assistant answer relies on and cites the sources retrieved by its tools, ' +
      'rather than inventing facts. Return only the structured JSON matching the provided schema.',
  },
})
  .preprocess(({ run }) => {
    const userText = getUserMessageFromRunInput(run.input) || '';
    const assistantText = getAssistantMessageFromRunOutput(run.output) || '';
    const sources = extractToolResults(run.output).map((t) => ({
      tool: t.toolName,
      result: t.result,
    }));
    return { userText, assistantText, sources };
  })
  .analyze({
    description: 'Determine if the answer is grounded in the retrieved sources',
    outputSchema: z.object({
      hadSources: z.boolean(),
      citesSources: z.boolean(),
      reasoning: z.string(),
    }),
    createPrompt: ({ results }) => `
You are evaluating whether a StackPicker assistant grounded its answer in the sources retrieved by its tools (web search, Wikipedia, npm registry).

User question:
"""
${results.preprocessStepResult.userText}
"""

Sources retrieved by the tools (may be empty):
"""
${JSON.stringify(results.preprocessStepResult.sources, null, 2)}
"""

Assistant answer:
"""
${results.preprocessStepResult.assistantText}
"""

Tasks:
1) hadSources: were any sources retrieved by the tools?
2) citesSources: does the answer actually rely on / reference those retrieved sources (facts, versions, names) instead of fabricating?

Return JSON with fields:
{
  "hadSources": boolean,
  "citesSources": boolean,
  "reasoning": string
}
    `,
  })
  .generateScore(({ results }) => {
    const r = (results as any)?.analyzeStepResult || {};
    if (!r.hadSources) return 1; // no source to cite -> not penalized
    return r.citesSources ? 1 : 0;
  })
  .generateReason(({ results, score }) => {
    const r = (results as any)?.analyzeStepResult || {};
    return `Source citation: hadSources=${r.hadSources ?? false}, citesSources=${r.citesSources ?? false}. Score=${score}. ${r.reasoning ?? ''}`;
  });

export const scorers = {
  toolCallAppropriatenessScorer,
  completenessScorer,
  scopeAdherenceScorer,
  hallucinationScorer,
  sourceCitationScorer,
};
