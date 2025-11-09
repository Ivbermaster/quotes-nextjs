// scripts/import.mjs
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { from: copyFrom } = require("pg-copy-streams");
const pump = promisify(pipeline);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const csvPath = path.join(process.cwd(), "data", "quotes.csv"); // quote,author,category
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Файл не найден: ${csvPath}`);
  }
  const conn = process.env.DATABASE_URL;
  if (!conn) throw new Error("Нет DATABASE_URL");

  const client = new Client({ connectionString: conn });
  await client.connect();

  // временная таблица под сырой csv
  await client.query(`DROP TABLE IF EXISTS quotes_tmp;`);
  await client.query(`
    CREATE TABLE quotes_tmp(
      text         text,
      author       text,
      category_raw text
    );
  `);

  // COPY ... FROM STDIN
  const copyStream = client.query(
    copyFrom(`COPY quotes_tmp (text, author, category_raw)
              FROM STDIN WITH (FORMAT csv, HEADER true)`)
  );
  await pump(fs.createReadStream(csvPath), copyStream);

  // нормализация категорий -> text[]
  await client.query(`
    INSERT INTO "Quote"(text, author, categories)
    SELECT
      COALESCE(NULLIF(trim(t.text), ''), 'unknown') AS text_norm,
      COALESCE(NULLIF(trim(t.author), ''), 'unknown') AS author_norm,
      COALESCE((
        SELECT ARRAY_AGG(v) FROM (
          SELECT DISTINCT NULLIF(trim(lower(x)), '') AS v
          FROM unnest(
            string_to_array(
              regexp_replace(COALESCE(t.category_raw, ''), '\\s*,\\s*', ',', 'g'),
              ','
            )
          ) AS x
        ) s WHERE v IS NOT NULL
      )::text[], ARRAY[]::text[]) AS categories_arr
    FROM quotes_tmp t;
  `);

  await client.query(`DROP TABLE quotes_tmp;`);
  await client.end();
  console.log("Импорт завершён");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
