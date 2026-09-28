import { z } from "zod";
import { calculateCommissions, calculateSummary, euro } from "@/lib/domain";
import { EMPLOYEES } from "@/lib/employees";
import { syncExpenseToSheets, syncSaleToSheets } from "@/lib/google-sheets";
import { expenseFromRow, saleFromRow } from "@/lib/records";
import { db } from "@/lib/supabase";
import { sendTelegramMessage } from "@/lib/telegram";
import type { Allocation, CommissionSplit, EmployeeSlug, Expense, ProjectCode, Sale, Source } from "@/lib/types";

const reference = z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9-]{1,39}$/, "Use a unique reference such as S01 or E01.");
const positiveCents = z.number().int().positive("Amount must be greater than zero.");
const percent = z.number().min(0).max(100);

export const saleInputSchema = z.object({
  reference,
  customer: z.string().trim().min(1),
  project: z.enum(["A", "B"]),
  description: z.string().trim().min(1),
  amountCents: positiveCents,
  split: z.object({ richard: percent, anastasia: percent, jeanClaude: percent }).refine(
    (value) => Math.abs(value.richard + value.anastasia + value.jeanClaude - 100) < 0.000001,
    "Commission shares must total 100%.",
  ),
});

export const expenseInputSchema = z.object({
  reference,
  description: z.string().trim().min(1),
  category: z.enum(["Materials", "Travel", "Other"]),
  amountCents: positiveCents,
  proposedAllocation: z.enum(["A", "B", "OVERHEAD"]),
});

export const approvalInputSchema = z.object({
  split: z.object({ richard: percent, anastasia: percent, jeanClaude: percent }).refine(
    (value) => Math.abs(value.richard + value.anastasia + value.jeanClaude - 100) < 0.000001,
    "Commission shares must total 100%.",
  ),
});

export const allocationInputSchema = z.object({ allocation: z.enum(["A", "B", "OVERHEAD"]) });

async function notificationChatFor(slug: EmployeeSlug, source: Source, originatingChatId?: string | null) {
  if (source === "telegram") return originatingChatId ?? null;
  const { data, error } = await db().from("employees").select("telegram_chat_id").eq("slug", slug).single();
  if (error) throw new Error(error.message);
  return data.telegram_chat_id ? String(data.telegram_chat_id) : null;
}

async function markSaleSync(referenceValue: string, status: "synced" | "failed", errorMessage: string | null) {
  await db().from("sales").update({ sheet_sync_status: status, sheet_sync_error: errorMessage, updated_at: new Date().toISOString() }).eq("reference", referenceValue);
}

async function markExpenseSync(referenceValue: string, status: "synced" | "failed", errorMessage: string | null) {
  await db().from("expenses").update({ sheet_sync_status: status, sheet_sync_error: errorMessage, updated_at: new Date().toISOString() }).eq("reference", referenceValue);
}

export async function syncSaleRecord(sale: Sale) {
  try {
    await syncSaleToSheets(sale);
    await markSaleSync(sale.reference, "synced", null);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Sheets error";
    await markSaleSync(sale.reference, "failed", message);
  }
  return getSale(sale.reference);
}

export async function syncExpenseRecord(expense: Expense) {
  try {
    await syncExpenseToSheets(expense);
    await markExpenseSync(expense.reference, "synced", null);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Sheets error";
    await markExpenseSync(expense.reference, "failed", message);
  }
  return getExpense(expense.reference);
}

export async function getSale(referenceValue: string) {
  const { data, error } = await db().from("sales").select("*").eq("reference", referenceValue).single();
  if (error || !data) throw new Error(error?.message ?? `Sale ${referenceValue} was not found.`);
  return saleFromRow(data);
}

export async function getExpense(referenceValue: string) {
  const { data, error } = await db().from("expenses").select("*").eq("reference", referenceValue).single();
  if (error || !data) throw new Error(error?.message ?? `Expense ${referenceValue} was not found.`);
  return expenseFromRow(data);
}

export async function submitSale(
  salesperson: Exclude<EmployeeSlug, "svetlana" | "kevin">,
  rawInput: unknown,
  source: Source,
  originatingChatId?: string | null,
) {
  const input = saleInputSchema.parse(rawInput);
  const notificationChatId = await notificationChatFor(salesperson, source, originatingChatId);
  const { data, error } = await db().from("sales").insert({
    reference: input.reference,
    salesperson,
    customer: input.customer,
    project: input.project,
    description: input.description,
    amount_cents: input.amountCents,
    proposed_richard_pct: input.split.richard,
    proposed_anastasia_pct: input.split.anastasia,
    proposed_jean_claude_pct: input.split.jeanClaude,
    status: "pending",
    source,
    notification_chat_id: notificationChatId,
    notification_status: notificationChatId ? "pending" : "no_recipient",
  }).select("*").single();
  if (error || !data) throw new Error(error?.code === "23505" ? `Duplicate reference ${input.reference}.` : error?.message ?? "Could not save sale.");
  return syncSaleRecord(saleFromRow(data));
}

export async function submitExpense(
  rawInput: unknown,
  source: Source,
  originatingChatId?: string | null,
) {
  const input = expenseInputSchema.parse(rawInput);
  const autoAllocated = input.proposedAllocation === "OVERHEAD";
  const notificationChatId = await notificationChatFor("kevin", source, originatingChatId);
  const { data, error } = await db().from("expenses").insert({
    reference: input.reference,
    reporter: "kevin",
    description: input.description,
    category: input.category,
    amount_cents: input.amountCents,
    proposed_allocation: input.proposedAllocation,
    final_allocation: autoAllocated ? "OVERHEAD" : null,
    status: autoAllocated ? "allocated" : "awaiting_allocation",
    source,
    notification_chat_id: notificationChatId,
    notification_status: autoAllocated ? "not_required" : notificationChatId ? "pending" : "no_recipient",
  }).select("*").single();
  if (error || !data) throw new Error(error?.code === "23505" ? `Duplicate reference ${input.reference}.` : error?.message ?? "Could not save expense.");
  return syncExpenseRecord(expenseFromRow(data));
}

function splitChanged(proposed: CommissionSplit, approved: CommissionSplit) {
  return proposed.richard !== approved.richard
    || proposed.anastasia !== approved.anastasia
    || proposed.jeanClaude !== approved.jeanClaude;
}

function saleDecisionMessage(sale: Sale) {
  if (!sale.approvedSplit || !sale.commissions) throw new Error(`Sale ${sale.reference} has not been approved.`);
  const changed = splitChanged(sale.proposedSplit, sale.approvedSplit);
  return [
    `Sale ${sale.reference} approved${changed ? " — commission split changed" : ""}.`,
    `Sale ${euro(sale.amountCents)}; total commission ${euro(sale.commissions.poolCents)}.`,
    `Richard: ${sale.proposedSplit.richard}% → ${sale.approvedSplit.richard}% (${euro(sale.commissions.richardCents)}).`,
    `Anastasia: ${sale.proposedSplit.anastasia}% → ${sale.approvedSplit.anastasia}% (${euro(sale.commissions.anastasiaCents)}).`,
    `Jean-Claude: ${sale.proposedSplit.jeanClaude}% → ${sale.approvedSplit.jeanClaude}% (${euro(sale.commissions.jeanClaudeCents)}).`,
  ].join("\n");
}

function expenseDecisionMessage(expense: Expense) {
  if (!expense.finalAllocation) throw new Error(`Expense ${expense.reference} has not been allocated.`);
  const changed = expense.proposedAllocation !== expense.finalAllocation;
  return [
    `Expense ${expense.reference}${changed ? " — allocation changed" : " — allocation confirmed"}.`,
    `${euro(expense.amountCents)}: ${expense.description}.`,
    `Proposed: ${expense.proposedAllocation}. Approved: ${expense.finalAllocation}.`,
  ].join("\n");
}

export async function retrySaleNotification(referenceValue: string) {
  const sale = await getSale(referenceValue);
  if (sale.status !== "approved") throw new Error(`Sale ${sale.reference} is still pending approval.`);
  if (!sale.notificationChatId) throw new Error(`Sale ${sale.reference} has no Telegram recipient.`);
  try {
    await sendTelegramMessage(sale.notificationChatId, saleDecisionMessage(sale));
    await db().from("sales").update({ notification_status: "sent", notification_error: null, updated_at: new Date().toISOString() }).eq("reference", sale.reference);
  } catch (error) {
    await db().from("sales").update({ notification_status: "failed", notification_error: error instanceof Error ? error.message : "Telegram failed", updated_at: new Date().toISOString() }).eq("reference", sale.reference);
  }
  return getSale(sale.reference);
}

export async function retryExpenseNotification(referenceValue: string) {
  const expense = await getExpense(referenceValue);
  if (expense.status !== "allocated") throw new Error(`Expense ${expense.reference} is still awaiting allocation.`);
  if (!expense.notificationChatId) throw new Error(`Expense ${expense.reference} has no Telegram recipient.`);
  try {
    await sendTelegramMessage(expense.notificationChatId, expenseDecisionMessage(expense));
    await db().from("expenses").update({ notification_status: "sent", notification_error: null, updated_at: new Date().toISOString() }).eq("reference", expense.reference);
  } catch (error) {
    await db().from("expenses").update({ notification_status: "failed", notification_error: error instanceof Error ? error.message : "Telegram failed", updated_at: new Date().toISOString() }).eq("reference", expense.reference);
  }
  return getExpense(expense.reference);
}

export async function approveSale(referenceValue: string, rawInput: unknown) {
  const input = approvalInputSchema.parse(rawInput);
  const existing = await getSale(referenceValue);
  if (existing.status === "approved") return existing;
  const commissions = calculateCommissions(existing.amountCents, input.split);
  const { data, error } = await db().from("sales").update({
    approved_richard_pct: input.split.richard,
    approved_anastasia_pct: input.split.anastasia,
    approved_jean_claude_pct: input.split.jeanClaude,
    commission_pool_cents: commissions.poolCents,
    richard_commission_cents: commissions.richardCents,
    anastasia_commission_cents: commissions.anastasiaCents,
    jean_claude_commission_cents: commissions.jeanClaudeCents,
    status: "approved",
    updated_at: new Date().toISOString(),
  }).eq("reference", referenceValue).eq("status", "pending").select("*").single();
  if (error || !data) return getSale(referenceValue);

  let sale = saleFromRow(data);
  if (sale.notificationChatId) {
    try {
      await sendTelegramMessage(sale.notificationChatId, saleDecisionMessage(sale));
      await db().from("sales").update({ notification_status: "sent", notification_error: null }).eq("reference", referenceValue);
    } catch (notifyError) {
      await db().from("sales").update({ notification_status: "failed", notification_error: notifyError instanceof Error ? notifyError.message : "Telegram failed" }).eq("reference", referenceValue);
    }
    sale = await getSale(referenceValue);
  }
  return syncSaleRecord(sale);
}

export async function allocateExpense(referenceValue: string, rawInput: unknown) {
  const input = allocationInputSchema.parse(rawInput);
  const existing = await getExpense(referenceValue);
  if (existing.status === "allocated") return existing;
  const { data, error } = await db().from("expenses").update({
    final_allocation: input.allocation,
    status: "allocated",
    updated_at: new Date().toISOString(),
  }).eq("reference", referenceValue).eq("status", "awaiting_allocation").select("*").single();
  if (error || !data) return getExpense(referenceValue);
  let expense = expenseFromRow(data);
  if (expense.notificationChatId) {
    try {
      await sendTelegramMessage(expense.notificationChatId, expenseDecisionMessage(expense));
      await db().from("expenses").update({ notification_status: "sent", notification_error: null }).eq("reference", referenceValue);
    } catch (notifyError) {
      await db().from("expenses").update({ notification_status: "failed", notification_error: notifyError instanceof Error ? notifyError.message : "Telegram failed" }).eq("reference", referenceValue);
    }
    expense = await getExpense(referenceValue);
  }
  return syncExpenseRecord(expense);
}

export async function getDashboard(role: EmployeeSlug) {
  const [salesResult, expenseResult, employeeResult] = await Promise.all([
    db().from("sales").select("*").order("submitted_at", { ascending: true }),
    db().from("expenses").select("*").order("submitted_at", { ascending: true }),
    db().from("employees").select("slug,display_name,role,telegram_user_id,telegram_chat_id").order("slug"),
  ]);
  if (salesResult.error) throw new Error(salesResult.error.message);
  if (expenseResult.error) throw new Error(expenseResult.error.message);
  if (employeeResult.error) throw new Error(employeeResult.error.message);

  const allSales = (salesResult.data ?? []).map(saleFromRow);
  const allExpenses = (expenseResult.data ?? []).map(expenseFromRow);
  const employeeRole = EMPLOYEES[role].role;
  const sales = employeeRole === "manager" ? allSales : employeeRole === "sales" ? allSales.filter((sale) => sale.salesperson === role) : [];
  const expenses = employeeRole === "manager" || role === "kevin" ? allExpenses : [];

  let contacts: Array<Record<string, unknown>> = [];
  if (employeeRole === "manager") {
    const contactResult = await db().from("telegram_contacts").select("telegram_user_id,telegram_chat_id,display_name,updated_at").order("updated_at", { ascending: false });
    if (contactResult.error) throw new Error(contactResult.error.message);
    contacts = contactResult.data ?? [];
  }

  return {
    role,
    sales,
    expenses,
    summary: employeeRole === "manager" ? calculateSummary(allSales, allExpenses) : null,
    employees: employeeRole === "manager" ? employeeResult.data : [],
    telegramContacts: contacts,
  };
}

export async function linkTelegramUser(employee: EmployeeSlug, telegramUserId: string, telegramChatId: string) {
  await db().from("employees").update({ telegram_user_id: null, telegram_chat_id: null, updated_at: new Date().toISOString() }).eq("telegram_user_id", telegramUserId);
  const { error } = await db().from("employees").update({ telegram_user_id: telegramUserId, telegram_chat_id: telegramChatId, updated_at: new Date().toISOString() }).eq("slug", employee);
  if (error) throw new Error(error.message);
}

export function projectFromInput(value: string): ProjectCode {
  const normalized = value.trim().toUpperCase();
  if (normalized !== "A" && normalized !== "B") throw new Error("Project must be A or B.");
  return normalized;
}

export function allocationFromInput(value: string): Allocation {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "_");
  if (normalized === "COMPANY" || normalized === "COMPANY_OVERHEAD") return "OVERHEAD";
  if (normalized !== "A" && normalized !== "B" && normalized !== "OVERHEAD") {
    throw new Error("Allocation must be A, B, or OVERHEAD.");
  }
  return normalized;
}
