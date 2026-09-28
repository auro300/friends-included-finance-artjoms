const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
if (!token || !secret || !appUrl) {
  throw new Error("Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, and NEXT_PUBLIC_APP_URL first.");
}

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`,
    secret_token: secret,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  }),
});
const result = await response.json();
if (!response.ok) throw new Error(JSON.stringify(result));
console.log("Telegram webhook configured.");

export {};
