import { enforceRole, errorResponse } from "@/lib/auth";
import { submitSale } from "@/lib/operations";

export async function POST(request: Request) {
  try {
    const slug = enforceRole(request, ["sales"]);
    if (slug === "svetlana" || slug === "kevin") throw new Error("Only a salesperson can submit a sale.");
    return Response.json(await submitSale(slug, await request.json(), "website"), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
