import { JWT } from "google-auth-library";
import { sheetsEnv } from "@/lib/env";
import { allocationLabel, euro } from "@/lib/domain";
import { EMPLOYEES } from "@/lib/employees";
import type { Expense, Sale } from "@/lib/types";

const SALES_HEADERS = [
  "Reference", "Submission time", "Salesperson", "Customer", "Project", "Description", "Amount",
  "Proposed Richard %", "Proposed Anastasia %", "Proposed Jean-Claude %",
  "Approved Richard %", "Approved Anastasia %", "Approved Jean-Claude %",
  "Richard earned", "Anastasia earned", "Jean-Claude earned", "Total commission",
  "Status", "Source", "Notification",
];

const EXPENSE_HEADERS = [
  "Reference", "Submission time", "Reporter", "Description", "Category", "Amount",
  "Proposed allocation", "Final allocation", "Status", "Source", "Notification",
];

async function sheetsRequest<T>(path: string, init?: { method?: string; body?: unknown }) {
  const env = sheetsEnv();
  const auth = new JWT({
    email: env.serviceAccountEmail,
    key: env.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const client = await auth.authorize();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.spreadsheetId}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${client.access_token}`,
      "Content-Type": "application/json",
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Google Sheets HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

function encodeRange(range: string) {
  return encodeURIComponent(range);
}

async function ensureTabsAndHeaders() {
  const metadata = await sheetsRequest<{ sheets?: Array<{ properties?: { title?: string } }> }>("?fields=sheets.properties.title");
  const titles = new Set((metadata.sheets ?? []).map((sheet) => sheet.properties?.title));
  const requests = ["Sales", "Expenses"]
    .filter((title) => !titles.has(title))
    .map((title) => ({ addSheet: { properties: { title } } }));
  if (requests.length) {
    await sheetsRequest(":batchUpdate", { method: "POST", body: { requests } });
  }
  await Promise.all([
    updateValues("Sales!A1:T1", [SALES_HEADERS]),
    updateValues("Expenses!A1:K1", [EXPENSE_HEADERS]),
  ]);
}

async function updateValues(range: string, values: unknown[][]) {
  return sheetsRequest(`/values/${encodeRange(range)}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    body: { range, majorDimension: "ROWS", values },
  });
}

async function upsertByReference(tab: "Sales" | "Expenses", values: unknown[]) {
  await ensureTabsAndHeaders();
  const refs = await sheetsRequest<{ values?: string[][] }>(`/values/${encodeRange(`${tab}!A2:A`)}?majorDimension=COLUMNS`);
  const index = (refs.values?.[0] ?? []).findIndex((value) => value === values[0]);
  if (index >= 0) {
    const row = index + 2;
    const end = tab === "Sales" ? "T" : "K";
    await updateValues(`${tab}!A${row}:${end}${row}`, [values]);
    return;
  }
  await sheetsRequest(`/values/${encodeRange(`${tab}!A:${tab === "Sales" ? "T" : "K"}`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: { values: [values] },
  });
}

export async function syncSaleToSheets(sale: Sale) {
  await upsertByReference("Sales", [
    sale.reference,
    sale.submittedAt,
    EMPLOYEES[sale.salesperson].displayName,
    sale.customer,
    sale.project,
    sale.description,
    euro(sale.amountCents),
    sale.proposedSplit.richard,
    sale.proposedSplit.anastasia,
    sale.proposedSplit.jeanClaude,
    sale.approvedSplit?.richard ?? "",
    sale.approvedSplit?.anastasia ?? "",
    sale.approvedSplit?.jeanClaude ?? "",
    sale.commissions ? euro(sale.commissions.richardCents) : euro(0),
    sale.commissions ? euro(sale.commissions.anastasiaCents) : euro(0),
    sale.commissions ? euro(sale.commissions.jeanClaudeCents) : euro(0),
    sale.commissions ? euro(sale.commissions.poolCents) : euro(0),
    sale.status,
    sale.source,
    sale.notificationStatus,
  ]);
}

export async function syncExpenseToSheets(expense: Expense) {
  await upsertByReference("Expenses", [
    expense.reference,
    expense.submittedAt,
    EMPLOYEES[expense.reporter].displayName,
    expense.description,
    expense.category,
    euro(expense.amountCents),
    allocationLabel(expense.proposedAllocation),
    expense.finalAllocation ? allocationLabel(expense.finalAllocation) : "",
    expense.status,
    expense.source,
    expense.notificationStatus,
  ]);
}
