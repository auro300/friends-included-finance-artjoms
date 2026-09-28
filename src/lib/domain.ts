import type {
  Allocation,
  CommissionAmounts,
  CommissionSplit,
  EmployeeRole,
  Expense,
  FinancialSummary,
  ProjectCode,
  Sale,
} from "@/lib/types";

const SPLIT_KEYS = ["richard", "anastasia", "jeanClaude"] as const;

export function assertPositiveCents(amountCents: number) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("Amount must be greater than zero and have no fractions of a cent.");
  }
}

export function assertValidSplit(split: CommissionSplit) {
  const values = SPLIT_KEYS.map((key) => split[key]);
  if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
    throw new Error("Each commission share must be between 0% and 100%.");
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 100) > 0.000001) {
    throw new Error("Commission shares must total 100%.");
  }
}

export function calculateCommissions(amountCents: number, split: CommissionSplit): CommissionAmounts {
  assertPositiveCents(amountCents);
  assertValidSplit(split);

  const poolCents = Math.round(amountCents * 0.1);
  const rounded = SPLIT_KEYS.map((key) => Math.round((poolCents * split[key]) / 100));
  const difference = poolCents - rounded.reduce((sum, value) => sum + value, 0);
  const largestIndex = SPLIT_KEYS.reduce((best, key, index) =>
    split[key] > split[SPLIT_KEYS[best]] ? index : best, 0);

  rounded[largestIndex] += difference;

  return {
    poolCents,
    richardCents: rounded[0],
    anastasiaCents: rounded[1],
    jeanClaudeCents: rounded[2],
  };
}

export function requireRole(actual: EmployeeRole, allowed: EmployeeRole[]) {
  if (!allowed.includes(actual)) {
    throw new Error("This role is not permitted to perform that action.");
  }
}

export function calculateSummary(sales: Sale[], expenses: Expense[]): FinancialSummary {
  const projects = {
    A: { approvedIncomeCents: 0, commissionExpenseCents: 0, allocatedExpenseCents: 0, resultCents: 0 },
    B: { approvedIncomeCents: 0, commissionExpenseCents: 0, allocatedExpenseCents: 0, resultCents: 0 },
  } satisfies Record<ProjectCode, FinancialSummary["projects"][ProjectCode]>;

  const commissionEarned = { richardCents: 0, anastasiaCents: 0, jeanClaudeCents: 0 };

  for (const sale of sales) {
    if (sale.status !== "approved" || !sale.commissions) continue;
    const project = projects[sale.project];
    project.approvedIncomeCents += sale.amountCents;
    project.commissionExpenseCents += sale.commissions.poolCents;
    commissionEarned.richardCents += sale.commissions.richardCents;
    commissionEarned.anastasiaCents += sale.commissions.anastasiaCents;
    commissionEarned.jeanClaudeCents += sale.commissions.jeanClaudeCents;
  }

  let overheadCents = 0;
  let awaitingAllocationCents = 0;
  let totalExpenseCents = 0;

  for (const expense of expenses) {
    totalExpenseCents += expense.amountCents;
    if (expense.status === "awaiting_allocation") {
      awaitingAllocationCents += expense.amountCents;
    } else if (expense.finalAllocation === "OVERHEAD") {
      overheadCents += expense.amountCents;
    } else if (expense.finalAllocation === "A" || expense.finalAllocation === "B") {
      projects[expense.finalAllocation].allocatedExpenseCents += expense.amountCents;
    }
  }

  for (const project of Object.values(projects)) {
    project.resultCents = project.approvedIncomeCents
      - project.commissionExpenseCents
      - project.allocatedExpenseCents;
  }

  const approvedIncomeCents = projects.A.approvedIncomeCents + projects.B.approvedIncomeCents;
  const commissionExpenseCents = projects.A.commissionExpenseCents + projects.B.commissionExpenseCents;

  return {
    projects,
    company: {
      approvedIncomeCents,
      commissionExpenseCents,
      allocatedProjectExpenseCents: projects.A.allocatedExpenseCents + projects.B.allocatedExpenseCents,
      overheadCents,
      awaitingAllocationCents,
      totalExpenseCents,
      resultCents: approvedIncomeCents - commissionExpenseCents - totalExpenseCents,
    },
    commissionEarned,
  };
}

export function allocationLabel(allocation: Allocation) {
  return allocation === "A"
    ? "Respectable Relatives"
    : allocation === "B"
      ? "Drunk University Friends"
      : "Company overhead";
}

export function euro(cents: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function parseEuroToCents(value: string | number) {
  const numberValue = typeof value === "number" ? value : Number(value.replace(",", "."));
  if (!Number.isFinite(numberValue)) throw new Error("Enter a valid amount.");
  const cents = Math.round(numberValue * 100);
  assertPositiveCents(cents);
  return cents;
}
