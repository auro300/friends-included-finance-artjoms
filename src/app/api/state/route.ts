import { errorResponse, roleFromRequest } from "@/lib/auth";
import { getDashboard } from "@/lib/operations";

export async function GET(request: Request) {
  try {
    return Response.json(await getDashboard(roleFromRequest(request)));
  } catch (error) {
    return errorResponse(error);
  }
}
