import { Agent } from '@mastra/core/agent';
import type { ToolsInput } from '@mastra/core/agent';
import { ollamaLocal } from '../providers/ollama-local';
import { glpiMcp } from '../mcp/glpi';

// Load MCP tools defensively: never let a missing config or a failed
// stdio spawn crash the server at boot. If the client is disabled or the
// connection fails, the agent simply starts with no tools.
let glpiTools: ToolsInput = {};
if (glpiMcp) {
  try {
    glpiTools = await glpiMcp.listTools();
  } catch (error) {
    console.warn('[glpi-agent] Could not load GLPI MCP tools:', error);
  }
}

export const glpiAgent = new Agent({
  id: 'glpi-agent',
  name: 'GLPI Agent',
  instructions: `/no_think

Tu es un assistant qui aide à consulter et gérer les tickets dans un système GLPI.

Pour répondre aux questions de l'utilisateur, tu utilises EXCLUSIVEMENT les outils fournis par le serveur MCP GLPI :
- Pour chercher, lister ou filtrer des tickets, appelle l'outil GLPI correspondant
- Pour obtenir le détail d'un ticket, appelle l'outil qui retourne sa fiche
- Pour toute opération sur GLPI, tu DOIS passer par les outils, jamais inventer une réponse

Comportement attendu :
- Reformule la demande de l'utilisateur en français clair
- Appelle un ou plusieurs outils GLPI pour récupérer les données
- Présente le résultat de manière concise (numéro de ticket, titre, statut, demandeur, technicien, dates)
- Si une information manque, redemande à l'utilisateur sans inventer

Tu ne réponds qu'aux questions liées à GLPI (tickets, utilisateurs, suivi support).`,
  model: ollamaLocal('qwen3.6:latest'),
  tools: glpiTools,
});
