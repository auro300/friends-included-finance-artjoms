import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Sale } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  syncSaleToSheets: vi.fn(),
  syncExpenseToSheets: vi.fn(),
  sendTelegramMessage: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ db: mocks.db }));
vi.mock("@/lib/google-sheets", () => ({
  syncSaleToSheets: mocks.syncSaleToSheets,
  syncExpenseToSheets: mocks.syncExpenseToSheets,
}));
vi.mock("@/lib/telegram", () => ({ sendTelegramMessage: mocks.sendTelegramMessage }));

import { approveSale, syncSaleRecord } from "@/lib/operations";

const pendingSale: Sale = {
  reference: "S98",
  submittedAt: "2026-09-29T08:00:00.000Z",
  salesperson: "richard",
  customer: "Resilience Test",
  project: "A",
  description: "A saved sale whose Sheet update is interrupted",
  amountCents: 10_000,
  proposedSplit: { richard: 50, anastasia: 30, jeanClaude: 20 },
  approvedSplit: null,
  commissions: null,
  status: "pending",
  source: "website",
  notificationChatId: null,
  sheetSyncStatus: "pending",
  sheetSyncError: null,
  notificationStatus: "no_recipient",
  notificationError: null,
};

function saleRow(overrides: Record<string, unknown> = {}) {
  return {
    reference: pendingSale.reference,
    submitted_at: pendingSale.submittedAt,
    salesperson: pendingSale.salesperson,
    customer: pendingSale.customer,
    project: pendingSale.project,
    description: pendingSale.description,
    amount_cents: pendingSale.amountCents,
    proposed_richard_pct: 50,
    proposed_anastasia_pct: 30,
    proposed_jean_claude_pct: 20,
    approved_richard_pct: null,
    approved_anastasia_pct: null,
    approved_jean_claude_pct: null,
    commission_pool_cents: null,
    richard_commission_cents: null,
    anastasia_commission_cents: null,
    jean_claude_commission_cents: null,
    status: "pending",
    source: "website",
    notification_chat_id: null,
    sheet_sync_status: "failed",
    sheet_sync_error: "Simulated Google Sheets interruption",
    notification_status: "no_recipient",
    notification_error: null,
    ...overrides,
  };
}

function mockSalesTable(row: Record<string, unknown>) {
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq: updateEq }));
  const single = vi.fn().mockResolvedValue({ data: row, error: null });
  const select = vi.fn(() => ({ eq: vi.fn(() => ({ single })) }));
  const from = vi.fn(() => ({ update, select }));
  mocks.db.mockReturnValue({ from });
  return { update, updateEq, select };
}

describe("integration resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps a saved sale and marks synchronization failed when Sheets is interrupted", async () => {
    const table = mockSalesTable(saleRow());
    mocks.syncSaleToSheets.mockRejectedValueOnce(new Error("Simulated Google Sheets interruption"));

    const result = await syncSaleRecord(pendingSale);

    expect(result.reference).toBe("S98");
    expect(result.sheetSyncStatus).toBe("failed");
    expect(table.update).toHaveBeenCalledWith(expect.objectContaining({
      sheet_sync_status: "failed",
      sheet_sync_error: "Simulated Google Sheets interruption",
    }));
  });

  it("treats a repeated approval as idempotent", async () => {
    const approvedRow = saleRow({
      status: "approved",
      approved_richard_pct: 50,
      approved_anastasia_pct: 30,
      approved_jean_claude_pct: 20,
      commission_pool_cents: 1_000,
      richard_commission_cents: 500,
      anastasia_commission_cents: 300,
      jean_claude_commission_cents: 200,
      sheet_sync_status: "synced",
      sheet_sync_error: null,
    });
    const table = mockSalesTable(approvedRow);

    const result = await approveSale("S98", {
      split: { richard: 50, anastasia: 30, jeanClaude: 20 },
    });

    expect(result.status).toBe("approved");
    expect(table.update).not.toHaveBeenCalled();
    expect(mocks.syncSaleToSheets).not.toHaveBeenCalled();
    expect(mocks.sendTelegramMessage).not.toHaveBeenCalled();
  });
});
