import { describe, expect, it } from "vitest";
import { calculateCommissions, calculateSummary } from "@/lib/domain";
import type { Expense, Sale } from "@/lib/types";

const baseSale: Omit<Sale, "reference" | "salesperson" | "customer" | "project" | "description" | "amountCents" | "proposedSplit" | "approvedSplit" | "commissions" | "status"> = {
  submittedAt: "2026-09-28T00:00:00.000Z",
  source: "website",
  notificationChatId: null,
  sheetSyncStatus: "synced",
  sheetSyncError: null,
  notificationStatus: "no_recipient",
  notificationError: null,
};

const baseExpense: Omit<Expense, "reference" | "description" | "category" | "amountCents" | "proposedAllocation" | "finalAllocation" | "status"> = {
  submittedAt: "2026-09-28T00:00:00.000Z",
  reporter: "kevin",
  source: "website",
  notificationChatId: null,
  sheetSyncStatus: "synced",
  sheetSyncError: null,
  notificationStatus: "no_recipient",
  notificationError: null,
};

function sale(
  reference: string,
  project: "A" | "B",
  amountCents: number,
  proposed: Sale["proposedSplit"],
  approved: Sale["approvedSplit"],
  salesperson: Sale["salesperson"],
  status: Sale["status"] = "approved",
): Sale {
  return {
    ...baseSale,
    reference,
    salesperson,
    customer: "Test customer",
    project,
    description: "Test sale",
    amountCents,
    proposedSplit: proposed,
    approvedSplit: status === "approved" ? approved : null,
    commissions: status === "approved" && approved ? calculateCommissions(amountCents, approved) : null,
    status,
  };
}

function expense(
  reference: string,
  amountCents: number,
  proposed: Expense["proposedAllocation"],
  finalAllocation: Expense["finalAllocation"],
  status: Expense["status"] = "allocated",
): Expense {
  return {
    ...baseExpense,
    reference,
    description: "Test expense",
    category: "Other",
    amountCents,
    proposedAllocation: proposed,
    finalAllocation: status === "allocated" ? finalAllocation : null,
    status,
  };
}

describe("commission rules", () => {
  it("calculates the supplied 50/30/20 example", () => {
    expect(calculateCommissions(100_000, { richard: 50, anastasia: 30, jeanClaude: 20 })).toEqual({
      poolCents: 10_000,
      richardCents: 5_000,
      anastasiaCents: 3_000,
      jeanClaudeCents: 2_000,
    });
  });

  it("gives a rounding difference to the largest share using the required tie order", () => {
    expect(calculateCommissions(333, { richard: 50, anastasia: 50, jeanClaude: 0 })).toEqual({
      poolCents: 33,
      richardCents: 16,
      anastasiaCents: 17,
      jeanClaudeCents: 0,
    });
  });

  it("refuses a split that does not total 100", () => {
    expect(() => calculateCommissions(10_000, { richard: 60, anastasia: 30, jeanClaude: 20 })).toThrow(
      "total 100%",
    );
  });
});

describe("assignment control totals", () => {
  const sales = [
    sale("S01", "A", 100_000, { richard: 50, anastasia: 30, jeanClaude: 20 }, { richard: 50, anastasia: 30, jeanClaude: 20 }, "richard"),
    sale("S02", "B", 200_000, { richard: 0, anastasia: 50, jeanClaude: 50 }, { richard: 20, anastasia: 40, jeanClaude: 40 }, "anastasia"),
    sale("S03", "A", 150_000, { richard: 40, anastasia: 40, jeanClaude: 20 }, { richard: 20, anastasia: 30, jeanClaude: 50 }, "jean-claude"),
    sale("S04", "B", 80_000, { richard: 25, anastasia: 25, jeanClaude: 50 }, { richard: 25, anastasia: 25, jeanClaude: 50 }, "richard"),
    sale("S05", "B", 60_000, { richard: 100, anastasia: 0, jeanClaude: 0 }, null, "richard", "pending"),
  ];
  const expenses = [
    expense("E01", 12_000, "A", "A"),
    expense("E02", 8_000, "B", "A"),
    expense("E03", 10_000, "OVERHEAD", "OVERHEAD"),
    expense("E04", 25_000, "B", "B"),
    expense("E05", 9_000, "A", "B"),
    expense("E06", 6_000, "OVERHEAD", "OVERHEAD"),
    expense("E07", 14_000, "A", null, "awaiting_allocation"),
  ];

  it("matches the cumulative Test 2 results", () => {
    const summary = calculateSummary(sales, expenses);
    expect(summary.projects.A.resultCents).toBe(205_000);
    expect(summary.projects.B.resultCents).toBe(218_000);
    expect(summary.company.resultCents).toBe(393_000);
    expect(summary.commissionEarned).toEqual({
      richardCents: 14_000,
      anastasiaCents: 17_500,
      jeanClaudeCents: 21_500,
    });
  });

  it("keeps pending sales out and awaiting expenses in the company result", () => {
    const summary = calculateSummary(sales, expenses);
    expect(summary.company.approvedIncomeCents).toBe(530_000);
    expect(summary.company.awaitingAllocationCents).toBe(14_000);
    expect(summary.company.totalExpenseCents).toBe(84_000);
  });
});
