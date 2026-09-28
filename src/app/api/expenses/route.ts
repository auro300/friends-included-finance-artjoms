import { enforceRole, errorResponse } from "@/lib/auth";
import { submitExpense } from "@/lib/operations";

export async function POST(request: Request) {
  try {
    const slug = enforceRole(request, ["expenses"]);
    if (slug !== "kevin") throw new Error("Only Kevin can submit an expense.");
    return Response.json(await submitExpense(await request.json(), "website"), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
