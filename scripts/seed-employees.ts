import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";

const employees = [
  { slug: "svetlana", display_name: "Svetlana de Monte Carlo", role: "manager" },
  { slug: "richard", display_name: "Richard “Call Me Dick” Darling", role: "sales" },
  { slug: "anastasia", display_name: "Anastasia Ferrari", role: "sales" },
  { slug: "jean-claude", display_name: "Jean-Claude Bērziņš", role: "sales" },
  { slug: "kevin", display_name: "Kevin von Whatever", role: "expenses" },
];

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.");

  const client = createClient<Database>(url, key, { auth: { persistSession: false } });
  const { error } = await client.from("employees").upsert(employees);
  if (error) throw error;
  console.log("Seeded five fictional employees.");
}

void main();
