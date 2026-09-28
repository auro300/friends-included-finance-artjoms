import { enforceRole, errorResponse } from "@/lib/auth";
import { isEmployeeSlug } from "@/lib/employees";
import { linkTelegramUser } from "@/lib/operations";

export async function POST(request: Request) {
  try {
    enforceRole(request, ["manager"]);
    const body = await request.json() as { employee?: string; telegramUserId?: string; telegramChatId?: string };
    if (!body.employee || !isEmployeeSlug(body.employee)) throw new Error("Choose a valid employee.");
    if (!body.telegramUserId?.trim() || !body.telegramChatId?.trim()) throw new Error("Telegram user ID and chat ID are required.");
    await linkTelegramUser(body.employee, body.telegramUserId.trim(), body.telegramChatId.trim());
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
