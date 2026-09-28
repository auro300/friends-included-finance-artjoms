import { FinanceDesk } from "@/components/finance-desk";

export default function Home() {
  return (
    <FinanceDesk
      links={{
        telegram: process.env.TELEGRAM_BOT_URL ?? "",
        sheet: process.env.GOOGLE_SHEET_URL ?? "",
        github: process.env.GITHUB_REPOSITORY_URL ?? "",
      }}
    />
  );
}
