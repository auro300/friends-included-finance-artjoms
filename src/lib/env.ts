function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}

export function supabaseEnv() {
  return {
    url: required("SUPABASE_URL"),
    serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export function telegramEnv() {
  return {
    botToken: required("TELEGRAM_BOT_TOKEN"),
    webhookSecret: required("TELEGRAM_WEBHOOK_SECRET"),
  };
}

export function sheetsEnv() {
  return {
    spreadsheetId: required("GOOGLE_SPREADSHEET_ID"),
    serviceAccountEmail: required("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    privateKey: required("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
  };
}
