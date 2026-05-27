import "dotenv/config";
import { tavilySearch } from "@tavily/ai-sdk";
import { stepCountIs, ToolLoopAgent } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";

const agent = new ToolLoopAgent({
  model: openrouter("mistralai/codestral-2508"),
  tools: {
    tavilySearch: tavilySearch(),
  },
  instructions: "You are a helpful assistant.",
  toolChoice: "required",
  stopWhen: stepCountIs(5),
});

const result = await agent.generate({
  prompt: "What is AI SDK?",
});

console.log("--- Tool calls ---");
console.log(result.toolCalls);
console.log("--- Tool results ---");
console.log(JSON.stringify(result.toolResults, null, 2));
console.log("--- Finish reason ---");
console.log(result.finishReason);
console.log("--- Steps ---");
console.log(result.steps?.length);
console.log("--- Text ---");
console.log(result.text);
