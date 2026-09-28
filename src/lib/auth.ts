import { EMPLOYEES, isEmployeeSlug } from "@/lib/employees";
import type { EmployeeRole, EmployeeSlug } from "@/lib/types";

export function roleFromRequest(request: Request): EmployeeSlug {
  const url = new URL(request.url);
  const value = request.headers.get("x-demonstration-role") ?? url.searchParams.get("role") ?? "";
  if (!isEmployeeSlug(value)) throw new Error("Choose a valid demonstration role.");
  return value;
}

export function enforceRole(request: Request, allowed: EmployeeRole[]) {
  const slug = roleFromRequest(request);
  if (!allowed.includes(EMPLOYEES[slug].role)) {
    throw new Error("This role is not permitted to perform that action.");
  }
  return slug;
}

export function errorResponse(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Unexpected error.";
  const conflict = /duplicate|already exists/i.test(message);
  return Response.json({ error: message }, { status: conflict ? 409 : status });
}
