import { enforceRole, errorResponse } from "@/lib/auth";
import { getExpense, getSale, syncExpenseRecord, syncSaleRecord } from "@/lib/operations";

export async function POST(request: Request, { params }: { params: Promise<{ kind: string; reference: string }> }) {
  try {
    enforceRole(request, ["manager"]);
    const { kind, reference } = await params;
    if (kind === "sale") return Response.json(await syncSaleRecord(await getSale(reference.toUpperCase())));
    if (kind === "expense") return Response.json(await syncExpenseRecord(await getExpense(reference.toUpperCase())));
    throw new Error("Retry kind must be sale or expense.");
  } catch (error) {
    return errorResponse(error);
  }
}
