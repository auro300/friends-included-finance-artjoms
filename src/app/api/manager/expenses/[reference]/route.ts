import { enforceRole, errorResponse } from "@/lib/auth";
import { allocateExpense } from "@/lib/operations";

export async function POST(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    enforceRole(request, ["manager"]);
    const { reference } = await params;
    return Response.json(await allocateExpense(reference.toUpperCase(), await request.json()));
  } catch (error) {
    return errorResponse(error);
  }
}
