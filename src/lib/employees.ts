import type { EmployeeRole, EmployeeSlug } from "@/lib/types";

export const EMPLOYEES: Record<EmployeeSlug, { displayName: string; role: EmployeeRole }> = {
  svetlana: { displayName: "Svetlana de Monte Carlo", role: "manager" },
  richard: { displayName: "Richard “Call Me Dick” Darling", role: "sales" },
  anastasia: { displayName: "Anastasia Ferrari", role: "sales" },
  "jean-claude": { displayName: "Jean-Claude Bērziņš", role: "sales" },
  kevin: { displayName: "Kevin von Whatever", role: "expenses" },
};

export function isEmployeeSlug(value: string): value is EmployeeSlug {
  return Object.prototype.hasOwnProperty.call(EMPLOYEES, value);
}
