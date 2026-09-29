import { describe, expect, it } from "vitest";
import {
  allocationInputSchema,
  approvalInputSchema,
  expenseInputSchema,
  saleInputSchema,
} from "@/lib/operations";

const validSale = {
  reference: "S99",
  customer: "Test Customer",
  project: "A",
  description: "Test sale",
  amountCents: 10_000,
  split: { richard: 50, anastasia: 30, jeanClaude: 20 },
};

const validExpense = {
  reference: "E99",
  description: "Test expense",
  category: "Travel",
  amountCents: 5_000,
  proposedAllocation: "B",
};

describe("transaction validation", () => {
  it("refuses a commission split that does not total 100%", () => {
    expect(() => saleInputSchema.parse({
      ...validSale,
      split: { richard: 60, anastasia: 30, jeanClaude: 20 },
    })).toThrow("total 100%");
  });

  it("refuses zero-value sales and expenses", () => {
    expect(() => saleInputSchema.parse({ ...validSale, amountCents: 0 })).toThrow(
      "greater than zero",
    );
    expect(() => expenseInputSchema.parse({ ...validExpense, amountCents: 0 })).toThrow(
      "greater than zero",
    );
  });

  it("refuses missing required transaction information", () => {
    expect(() => saleInputSchema.parse({ ...validSale, customer: "" })).toThrow();
    expect(() => expenseInputSchema.parse({ ...validExpense, description: "" })).toThrow();
  });

  it("validates corrected manager decisions", () => {
    expect(approvalInputSchema.parse({
      split: { richard: 20, anastasia: 30, jeanClaude: 50 },
    })).toEqual({ split: { richard: 20, anastasia: 30, jeanClaude: 50 } });
    expect(allocationInputSchema.parse({ allocation: "OVERHEAD" })).toEqual({
      allocation: "OVERHEAD",
    });
  });
});
