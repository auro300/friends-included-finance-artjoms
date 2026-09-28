export const EMPLOYEE_SLUGS = [
  "svetlana",
  "richard",
  "anastasia",
  "jean-claude",
  "kevin",
] as const;

export type EmployeeSlug = (typeof EMPLOYEE_SLUGS)[number];
export type EmployeeRole = "manager" | "sales" | "expenses";
export type ProjectCode = "A" | "B";
export type Allocation = ProjectCode | "OVERHEAD";
export type Source = "website" | "telegram";
export type SyncStatus = "pending" | "synced" | "failed";
export type DeliveryStatus = "not_required" | "pending" | "sent" | "failed" | "no_recipient";

export interface Employee {
  slug: EmployeeSlug;
  displayName: string;
  role: EmployeeRole;
  telegramUserId: string | null;
  telegramChatId: string | null;
}

export interface CommissionSplit {
  richard: number;
  anastasia: number;
  jeanClaude: number;
}

export interface CommissionAmounts {
  poolCents: number;
  richardCents: number;
  anastasiaCents: number;
  jeanClaudeCents: number;
}

export interface Sale {
  reference: string;
  submittedAt: string;
  salesperson: Exclude<EmployeeSlug, "svetlana" | "kevin">;
  customer: string;
  project: ProjectCode;
  description: string;
  amountCents: number;
  proposedSplit: CommissionSplit;
  approvedSplit: CommissionSplit | null;
  commissions: CommissionAmounts | null;
  status: "pending" | "approved";
  source: Source;
  notificationChatId: string | null;
  sheetSyncStatus: SyncStatus;
  sheetSyncError: string | null;
  notificationStatus: DeliveryStatus;
  notificationError: string | null;
}

export interface Expense {
  reference: string;
  submittedAt: string;
  reporter: "kevin";
  description: string;
  category: "Materials" | "Travel" | "Other";
  amountCents: number;
  proposedAllocation: Allocation;
  finalAllocation: Allocation | null;
  status: "awaiting_allocation" | "allocated";
  source: Source;
  notificationChatId: string | null;
  sheetSyncStatus: SyncStatus;
  sheetSyncError: string | null;
  notificationStatus: DeliveryStatus;
  notificationError: string | null;
}

export interface FinancialSummary {
  projects: Record<ProjectCode, {
    approvedIncomeCents: number;
    commissionExpenseCents: number;
    allocatedExpenseCents: number;
    resultCents: number;
  }>;
  company: {
    approvedIncomeCents: number;
    commissionExpenseCents: number;
    allocatedProjectExpenseCents: number;
    overheadCents: number;
    awaitingAllocationCents: number;
    totalExpenseCents: number;
    resultCents: number;
  };
  commissionEarned: {
    richardCents: number;
    anastasiaCents: number;
    jeanClaudeCents: number;
  };
}
