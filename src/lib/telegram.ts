import { telegramEnv } from "@/lib/env";

export async function sendTelegramMessage(chatId: string, text: string) {
  const { botToken } = telegramEnv();
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
    cache: "no-store",
  });
  const result = await response.json() as { ok?: boolean; description?: string };
  if (!response.ok || !result.ok) {
    throw new Error(result.description ?? `Telegram returned HTTP ${response.status}.`);
  }
}
