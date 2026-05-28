// Test direct de l'embedder bge-m3 via Ollama, sans passer par Mastra.
// Utile pour confirmer que la chaîne réseau et le modèle répondent.
import 'dotenv/config';

const url = process.env.OLLAMA_LOCAL_URL;
if (!url) {
  console.error('OLLAMA_LOCAL_URL is not set in .env');
  process.exit(1);
}

const endpoint = `${url}/embeddings`;
const body = {
  model: 'bge-m3:latest',
  input: 'Hello, this is a test embedding.',
};

console.log(`POST ${endpoint}`);
console.log('body:', JSON.stringify(body));

const start = Date.now();
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const duration = Date.now() - start;

if (!response.ok) {
  console.error(`HTTP ${response.status} ${response.statusText}`);
  console.error(await response.text());
  process.exit(1);
}

const data = await response.json();
const vec = data.data?.[0]?.embedding;
console.log(`\nOK in ${duration}ms`);
console.log(`embedding length = ${vec?.length}`);
console.log(`first 5 values = ${vec?.slice(0, 5).map((n) => n.toFixed(6)).join(', ')}`);
if (vec?.length !== 1024) {
  console.warn(`⚠️  expected 1024 dims for bge-m3, got ${vec?.length}`);
}
