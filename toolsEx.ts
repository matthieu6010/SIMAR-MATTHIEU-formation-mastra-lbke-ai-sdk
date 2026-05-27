import "dotenv/config";
import { streamText, tool, stepCountIs } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { tavily } from "@tavily/core";
import { z } from "zod";

// Client Tavily : récupère TAVILY_API_KEY depuis le .env
const tvly = tavily();

// ============================================================
// Tool calling : on expose deux outils au LLM
//   - weather : mock météo
//   - tavilySearch : recherche Internet réelle via Tavily
// Le SDK gère la boucle d'appels d'outils jusqu'à stepCountIs.
// ============================================================
const result = streamText({
  model: openrouter("mistralai/codestral-2508"),
  tools: {
    weather: tool({
      description: "Get the weather in a location",
      inputSchema: z.object({
        location: z.string().describe("The location to get the weather for"),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
    }),
    tavilySearch: tool({
      description:
        "Search the web for up-to-date information on any topic. Use this when the user asks about recent events, libraries, frameworks, or anything you might not know.",
      inputSchema: z.object({
        query: z.string().describe("The search query to send to the web"),
      }),
      execute: async ({ query }) => {
        const response = await tvly.search(query, {
          searchDepth: "advanced",
          includeAnswer: true,
          maxResults: 5,
        });
        return {
          answer: response.answer,
          results: response.results.map((r) => ({
            title: r.title,
            url: r.url,
            content: r.content,
          })),
        };
      },
    }),
  },
  stopWhen: stepCountIs(5),
  toolChoice: "auto",
  prompt: "What is the first model of openAI",
});

// Affiche le flux complet (chaque événement : appel d'outil,
// résultat d'outil, deltas de texte, fin de step, etc.)
for await (const part of result.fullStream) {
  console.log(part);
}

// Affiche la réponse finale en texte une fois le stream terminé
console.log("\n--- Final text ---");
console.log(await result.text);
