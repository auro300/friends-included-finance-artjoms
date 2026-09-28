import { enforceRole, errorResponse } from "@/lib/auth";
import { approveSale } from "@/lib/operations";

export async function POST(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    enforceRole(request, ["manager"]);
    const { reference } = await params;
    return Response.json(await approveSale(reference.toUpperCase(), await request.json()));
  } catch (error) {
    return errorResponse(error);
  }
}
