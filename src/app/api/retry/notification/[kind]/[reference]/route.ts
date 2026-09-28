import { enforceRole, errorResponse } from "@/lib/auth";
import { retryExpenseNotification, retrySaleNotification } from "@/lib/operations";

export async function POST(request: Request, { params }: { params: Promise<{ kind: string; reference: string }> }) {
  try {
    enforceRole(request, ["manager"]);
    const { kind, reference } = await params;
    if (kind === "sale") return Response.json(await retrySaleNotification(reference.toUpperCase()));
    if (kind === "expense") return Response.json(await retryExpenseNotification(reference.toUpperCase()));
    throw new Error("Notification retry kind must be sale or expense.");
  } catch (error) {
    return errorResponse(error);
  }
}
