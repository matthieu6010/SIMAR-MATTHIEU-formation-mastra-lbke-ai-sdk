import "dotenv/config";
import { generateText, streamText, Output } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

const model = openrouter("mistralai/codestral-2508");

// ============================================================
// Ancien code : conversation multi-tours avec Stackpicker
// ============================================================
// const system =
//   "You are Stackpicker, a chatbot expert in selecting technological stacks for software engineering projects.";
//
// const firstUserMessage = `
// What are the technologies for LLM development similar to LangChain?
//
// Output your answer in following JSON format:
// [technology 1, technology 2]
//   `;
//
// // 1er appel :
// const { text: first } = await generateText({
//   model,
//   system,
//   prompt: firstUserMessage,
// });
// console.log("Assistant 1:", first);
//
// // 2e appel :
// const { text: second } = await generateText({
//   model,
//   system,
//   messages: [
//     {
//       role: "user",
//       content: firstUserMessage,
//     },
//     {
//       role: "assistant",
//       content: first,
//     },
//     {
//       role: "user",
//       content: "And what is your personal favorite among them?",
//     },
//   ],
// });
// console.log("Assistant 2:", second);
//
// // 3e appel :
// const { text: third } = await generateText({
//   model,
//   system,
//   messages: [
//     {
//       role: "user",
//       content: firstUserMessage,
//     },
//     {
//       role: "assistant",
//       content: first,
//     },
//     {
//       role: "user",
//       content:
//         "And what is your personal favorite among them? You MUST answer the question in your opinion",
//     },
//     {
//       role: "assistant",
//       content: second,
//     },
//     {
//       role: "user",
//       content: "Traduis ta réponse précédente en français.",
//     },
//     {
//       role: "assistant",
//       content: "Ma techno préférée : Azure",
//     },
//   ],
// });
// console.log("Assistant 3:", third);

// ============================================================
// Ancien code : Few-shot learning
// ============================================================
// const { text } = await generateText({
//   model,
//   messages: [
//     {
//       role: "user",
//       content: "2+2",
//     },
//     {
//       role: "assistant",
//       content: "Opération: addition;résultat:3",
//     },
//     {
//       role: "user",
//       content: "4321/34148",
//     },
//   ],
// });
// console.log("Assistant:", text);

// ============================================================
// Ancien code : Préfixe HTML (style Yoda)
// ============================================================
// const { text } = await generateText({
//   model,
//   messages: [
//     {
//       role: "user",
//       content:
//         "What are the technologies for LLM development similar to LangChain? Output your answer as a valid HTML document (with <html>, <head>, <body>, headings, lists, etc.).",
//     },
//     {
//       role: "assistant",
//       content: "<!DOCTYPE html>\n<html>\n<head><title>Young padawan, listen you must</title></head>\n<body>\n",
//       providerOptions: {
//         openrouter: {
//           prefix: true,
//         },
//       },
//     },
//   ],
// });
// console.log("Assistant:", text);

// ============================================================
// Ancien code : Préfixe XML
// ============================================================
// const { text } = await generateText({
//   model,
//   messages: [
//     {
//       role: "user",
//       content:
//         "What are the technologies for LLM development similar to LangChain? Output your answer as a valid XML document with a root <technologies> element containing <technology> children (each with <name>, <description> and <url> sub-elements).",
//     },
//     {
//       role: "assistant",
//       content:
//         '<?xml version="1.0" encoding="UTF-8"?>\n<technologies>\n  <technology>\n    <name>',
//       providerOptions: {
//         openrouter: {
//           prefix: true,
//         },
//       },
//     },
//   ],
// });
// console.log("Assistant:", text);

// ============================================================
// Ancien code : Zod + generateText (sortie structurée complète)
// ============================================================
// const { output } = await generateText({
//   model,
//   system:
//     "You are Stackpicker, a chatbot expert in selecting technological stacks for software engineering projects.",
//   output: Output.array({
//     element: z.object({
//       technology: z.string().describe("The name of the technology"),
//       description: z
//         .string()
//         .describe("A short description of what the technology does"),
//       url: z.string().describe("The official website or documentation URL"),
//       language: z
//         .string()
//         .describe("The main programming language used by the technology"),
//     }),
//   }),
//   prompt: "Who is Zidane ?",
// });
//
// console.log("Output:", JSON.stringify(output, null, 2));

// ============================================================
// streamText : version streaming de la sortie structurée.
// On itère sur partialOutputStream pour voir le tableau se
// remplir au fil de l'eau (objets partiels validés contre Zod).
// ============================================================
const { partialOutputStream } = streamText({
  model,
  // maxOutputTokens: 30,
  system:
    "You are Stackpicker, a chatbot expert in selecting technological stacks for software engineering projects.",
  output: Output.array({
    element: z.discriminatedUnion("category", [
      z.object({
        category: z.literal("framework"),
        name: z.string().describe("The name of the framework"),
        language: z
          .string()
          .describe("The main programming language used by the framework"),
      }),
      z.object({
        category: z.literal("service"),
        name: z.string().describe("The name of the service"),
        provider: z
          .string()
          .describe("The company providing the service (e.g. OpenAI, AWS)"),
        pricing: z
          .enum(["free", "paid", "freemium"])
          .describe("The pricing model of the service"),
      }),
    ]),
  }),
  prompt:
    "List 5 tools for LLM development, mixing open-source frameworks and cloud services.",
});

for await (const partial of partialOutputStream) {
  console.clear();
  console.log(JSON.stringify(partial, null, 2));
}
