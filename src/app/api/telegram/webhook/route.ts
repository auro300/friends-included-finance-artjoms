import { euro, parseEuroToCents } from "@/lib/domain";
import { telegramEnv } from "@/lib/env";
import { allocationFromInput, projectFromInput, submitExpense, submitSale } from "@/lib/operations";
import { db } from "@/lib/supabase";
import { sendTelegramMessage } from "@/lib/telegram";

interface TelegramUpdate {
  update_id: number;
  message?: {
    text?: string;
    chat: { id: number; first_name?: string; last_name?: string; username?: string };
    from?: { id: number; first_name?: string; last_name?: string; username?: string };
  };
}

function helpFor(role?: string) {
  if (role === "sales") {
    return [
      "Submit a sale with:",
      "/sale S01 | Olivia Rose | A | One proud uncle and an emotional grandmother | 1000 | 50 | 30 | 20",
      "The percentages are Richard | Anastasia | Jean-Claude and must total 100.",
    ].join("\n");
  }
  if (role === "expenses") {
    return [
      "Submit an expense with:",
      "/expense E01 | Materials | 120 | A | Rented suit and fake pearl necklace for the relatives",
      "Category: Materials, Travel, or Other. Allocation: A, B, or OVERHEAD.",
    ].join("\n");
  }
  return "Your Telegram account is linked for manager access. Use the website to approve transactions and change employee links.";
}

function parseSale(text: string) {
  const parts = text.split("|").map((part) => part.trim());
  const first = parts.shift()?.split(/\s+/) ?? [];
  if (first.length < 2 || parts.length !== 7) throw new Error("Use: /sale REF | CUSTOMER | A/B | DESCRIPTION | AMOUNT | RICHARD% | ANASTASIA% | JEAN-CLAUDE%");
  const [customer, project, description, amount, richard, anastasia, jeanClaude] = parts;
  return {
    reference: first[1].toUpperCase(),
    customer,
    project: projectFromInput(project),
    description,
    amountCents: parseEuroToCents(amount),
    split: { richard: Number(richard), anastasia: Number(anastasia), jeanClaude: Number(jeanClaude) },
  };
}

function parseExpense(text: string) {
  const parts = text.split("|").map((part) => part.trim());
  const first = parts.shift()?.split(/\s+/) ?? [];
  if (first.length < 2 || parts.length !== 4) throw new Error("Use: /expense REF | CATEGORY | AMOUNT | A/B/OVERHEAD | DESCRIPTION");
  const [category, amount, allocation, description] = parts;
  if (category !== "Materials" && category !== "Travel" && category !== "Other") {
    throw new Error("Category must be Materials, Travel, or Other.");
  }
  return {
    reference: first[1].toUpperCase(),
    category,
    amountCents: parseEuroToCents(amount),
    proposedAllocation: allocationFromInput(allocation),
    description,
  };
}

export async function POST(request: Request) {
  let update: TelegramUpdate | undefined;
  try {
    const { webhookSecret } = telegramEnv();
    if (request.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret) {
      return Response.json({ ok: false }, { status: 401 });
    }
    update = await request.json() as TelegramUpdate;
    const { error: updateError } = await db().from("telegram_updates").insert({ update_id: update.update_id });
    if (updateError?.code === "23505") return Response.json({ ok: true, duplicate: true });
    if (updateError) throw new Error(updateError.message);
    if (!update.message?.from || !update.message.text) return Response.json({ ok: true });

    const userId = String(update.message.from.id);
    const chatId = String(update.message.chat.id);
    const displayName = [update.message.from.first_name, update.message.from.last_name]
      .filter(Boolean).join(" ") || update.message.from.username || `Telegram ${userId}`;
    await db().from("telegram_contacts").upsert({
      telegram_user_id: userId,
      telegram_chat_id: chatId,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    });

    const { data: employee } = await db().from("employees").select("slug,role,display_name").eq("telegram_user_id", userId).maybeSingle();
    const text = update.message.text.trim();
    if (!employee) {
      await sendTelegramMessage(chatId, `Your Telegram user ID is ${userId}. Ask Svetlana to link this ID to a fictional employee in the manager setup screen. You cannot submit transactions until it is linked.`);
      return Response.json({ ok: true });
    }
    if (text === "/start" || text === "/help") {
      await sendTelegramMessage(chatId, `Linked as ${employee.display_name}.\n\n${helpFor(employee.role)}`);
      return Response.json({ ok: true });
    }
    if (text.startsWith("/sale")) {
      if (employee.role !== "sales") throw new Error("Only Richard, Anastasia, or Jean-Claude can submit a sale.");
      const slug = employee.slug as "richard" | "anastasia" | "jean-claude";
      const sale = await submitSale(slug, parseSale(text), "telegram", chatId);
      await sendTelegramMessage(chatId, `Recorded ${sale.reference}: ${euro(sale.amountCents)}, project ${sale.project}, status Pending approval. Sheets: ${sale.sheetSyncStatus}.`);
      return Response.json({ ok: true });
    }
    if (text.startsWith("/expense")) {
      if (employee.slug !== "kevin") throw new Error("Only Kevin can submit an expense.");
      const expense = await submitExpense(parseExpense(text), "telegram", chatId);
      await sendTelegramMessage(chatId, `Recorded ${expense.reference}: ${euro(expense.amountCents)}, proposed allocation ${expense.proposedAllocation}, status ${expense.status.replaceAll("_", " ")}. Sheets: ${expense.sheetSyncStatus}.`);
      return Response.json({ ok: true });
    }
    await sendTelegramMessage(chatId, helpFor(employee.role));
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not process that message.";
    try {
      if (update?.message?.chat.id) await sendTelegramMessage(String(update.message.chat.id), `Not recorded: ${message}`);
    } catch {
      // The update may already have been consumed or Telegram may be unavailable.
    }
    return Response.json({ ok: true, error: message });
  }
}
