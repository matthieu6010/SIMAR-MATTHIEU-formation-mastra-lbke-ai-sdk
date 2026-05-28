import sqlite3pkg from 'sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sqlite3 = sqlite3pkg.verbose();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../src/mastra/public/mastra.db');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Cannot open DB at', dbPath, err.message);
    process.exit(1);
  }
});

const sql = `
  SELECT
    id,
    resourceId,
    length(metadata) AS metaBytes,
    cast(metadata AS text) AS metaText
  FROM mastra_threads
  WHERE resourceId = 'stackpicker-agent'
  ORDER BY rowid DESC
  LIMIT 10
`;

db.all(sql, (err, rows) => {
  if (err) {
    console.error('Query failed:', err.message);
    process.exit(1);
  }

  if (rows.length === 0) {
    console.log('No stackpicker-agent threads found.');
    db.close();
    return;
  }

  console.log(`Found ${rows.length} stackpicker-agent thread(s):\n`);

  for (const row of rows) {
    console.log(`--- thread ${row.id} (${row.metaBytes ?? 0} bytes in metadata) ---`);
    if (!row.metaText || row.metaBytes < 10) {
      console.log('  [no working memory yet]\n');
      continue;
    }
    try {
      const parsed = JSON.parse(row.metaText);
      if (parsed.workingMemory) {
        console.log(parsed.workingMemory);
      } else {
        console.log('  metadata:', parsed);
      }
    } catch {
      console.log('  raw:', row.metaText);
    }
    console.log();
  }

  db.close();
});
