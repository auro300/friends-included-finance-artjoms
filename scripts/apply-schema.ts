import fs from "node:fs/promises";
import { Client } from "pg";

async function main() {
  const connectionString = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
  if (!connectionString) throw new Error("Set POSTGRES_URL_NON_POOLING or POSTGRES_URL before applying the schema.");

  const sql = await fs.readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8");
  const databaseUrl = new URL(connectionString);
  databaseUrl.searchParams.delete("sslmode");
  const client = new Client({ connectionString: databaseUrl.toString(), ssl: { rejectUnauthorized: false } });

  await client.connect();
  try {
    await client.query(sql);
    console.log("Applied the Friends Included Supabase schema.");
  } finally {
    await client.end();
  }
}

void main();
