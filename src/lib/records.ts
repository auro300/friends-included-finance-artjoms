import type { Expense, Sale } from "@/lib/types";

type DbRecord = Record<string, unknown>;

const str = (value: unknown) => (value == null ? null : String(value));
const num = (value: unknown) => Number(value);

export function saleFromRow(row: DbRecord): Sale {
  const approved = row.status === "approved";
  return {
    reference: String(row.reference),
    submittedAt: String(row.submitted_at),
    salesperson: row.salesperson as Sale["salesperson"],
    customer: String(row.customer),
    project: row.project as Sale["project"],
    description: String(row.description),
    amountCents: num(row.amount_cents),
    proposedSplit: {
      richard: num(row.proposed_richard_pct),
      anastasia: num(row.proposed_anastasia_pct),
      jeanClaude: num(row.proposed_jean_claude_pct),
    },
    approvedSplit: approved ? {
      richard: num(row.approved_richard_pct),
      anastasia: num(row.approved_anastasia_pct),
      jeanClaude: num(row.approved_jean_claude_pct),
    } : null,
    commissions: approved ? {
      poolCents: num(row.commission_pool_cents),
      richardCents: num(row.richard_commission_cents),
      anastasiaCents: num(row.anastasia_commission_cents),
      jeanClaudeCents: num(row.jean_claude_commission_cents),
    } : null,
    status: row.status as Sale["status"],
    source: row.source as Sale["source"],
    notificationChatId: str(row.notification_chat_id),
    sheetSyncStatus: row.sheet_sync_status as Sale["sheetSyncStatus"],
    sheetSyncError: str(row.sheet_sync_error),
    notificationStatus: row.notification_status as Sale["notificationStatus"],
    notificationError: str(row.notification_error),
  };
}

export function expenseFromRow(row: DbRecord): Expense {
  return {
    reference: String(row.reference),
    submittedAt: String(row.submitted_at),
    reporter: "kevin",
    description: String(row.description),
    category: row.category as Expense["category"],
    amountCents: num(row.amount_cents),
    proposedAllocation: row.proposed_allocation as Expense["proposedAllocation"],
    finalAllocation: row.final_allocation as Expense["finalAllocation"],
    status: row.status as Expense["status"],
    source: row.source as Expense["source"],
    notificationChatId: str(row.notification_chat_id),
    sheetSyncStatus: row.sheet_sync_status as Expense["sheetSyncStatus"],
    sheetSyncError: str(row.sheet_sync_error),
    notificationStatus: row.notification_status as Expense["notificationStatus"],
    notificationError: str(row.notification_error),
  };
}
