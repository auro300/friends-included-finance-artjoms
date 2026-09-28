type Nullable<T> = T | null;

type EmployeeRow = {
  slug: string; display_name: string; role: string; telegram_user_id: Nullable<string>;
  telegram_chat_id: Nullable<string>; updated_at: string;
};
type SaleRow = {
  reference: string; submitted_at: string; salesperson: string; customer: string; project: string; description: string;
  amount_cents: number; proposed_richard_pct: number; proposed_anastasia_pct: number; proposed_jean_claude_pct: number;
  approved_richard_pct: Nullable<number>; approved_anastasia_pct: Nullable<number>; approved_jean_claude_pct: Nullable<number>;
  commission_pool_cents: Nullable<number>; richard_commission_cents: Nullable<number>; anastasia_commission_cents: Nullable<number>;
  jean_claude_commission_cents: Nullable<number>; status: string; source: string; notification_chat_id: Nullable<string>;
  sheet_sync_status: string; sheet_sync_error: Nullable<string>; notification_status: string; notification_error: Nullable<string>;
  created_at: string; updated_at: string;
};
type ExpenseRow = {
  reference: string; submitted_at: string; reporter: string; description: string; category: string; amount_cents: number;
  proposed_allocation: string; final_allocation: Nullable<string>; status: string; source: string; notification_chat_id: Nullable<string>;
  sheet_sync_status: string; sheet_sync_error: Nullable<string>; notification_status: string; notification_error: Nullable<string>;
  created_at: string; updated_at: string;
};
type TelegramUpdateRow = { update_id: number; received_at: string };
type TelegramContactRow = { telegram_user_id: string; telegram_chat_id: string; display_name: string; updated_at: string };

type TableDefinition<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      employees: TableDefinition<EmployeeRow, Pick<EmployeeRow, "slug" | "display_name" | "role"> & Partial<EmployeeRow>>;
      sales: TableDefinition<SaleRow, Pick<SaleRow, "reference" | "salesperson" | "customer" | "project" | "description" | "amount_cents" | "proposed_richard_pct" | "proposed_anastasia_pct" | "proposed_jean_claude_pct" | "source"> & Partial<SaleRow>>;
      expenses: TableDefinition<ExpenseRow, Pick<ExpenseRow, "reference" | "reporter" | "description" | "category" | "amount_cents" | "proposed_allocation" | "status" | "source"> & Partial<ExpenseRow>>;
      telegram_updates: TableDefinition<TelegramUpdateRow, Pick<TelegramUpdateRow, "update_id"> & Partial<TelegramUpdateRow>>;
      telegram_contacts: TableDefinition<TelegramContactRow, Pick<TelegramContactRow, "telegram_user_id" | "telegram_chat_id" | "display_name"> & Partial<TelegramContactRow>>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
