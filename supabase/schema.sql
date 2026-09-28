create table if not exists public.employees (
  slug text primary key check (slug in ('svetlana', 'richard', 'anastasia', 'jean-claude', 'kevin')),
  display_name text not null,
  role text not null check (role in ('manager', 'sales', 'expenses')),
  telegram_user_id text unique,
  telegram_chat_id text,
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  reference text primary key check (reference ~ '^[A-Z][A-Z0-9-]{1,39}$'),
  submitted_at timestamptz not null default now(),
  salesperson text not null references public.employees(slug),
  customer text not null,
  project text not null check (project in ('A', 'B')),
  description text not null,
  amount_cents bigint not null check (amount_cents > 0),
  proposed_richard_pct numeric not null check (proposed_richard_pct between 0 and 100),
  proposed_anastasia_pct numeric not null check (proposed_anastasia_pct between 0 and 100),
  proposed_jean_claude_pct numeric not null check (proposed_jean_claude_pct between 0 and 100),
  approved_richard_pct numeric check (approved_richard_pct between 0 and 100),
  approved_anastasia_pct numeric check (approved_anastasia_pct between 0 and 100),
  approved_jean_claude_pct numeric check (approved_jean_claude_pct between 0 and 100),
  commission_pool_cents bigint,
  richard_commission_cents bigint,
  anastasia_commission_cents bigint,
  jean_claude_commission_cents bigint,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  source text not null check (source in ('website', 'telegram')),
  notification_chat_id text,
  sheet_sync_status text not null default 'pending' check (sheet_sync_status in ('pending', 'synced', 'failed')),
  sheet_sync_error text,
  notification_status text not null default 'pending' check (notification_status in ('not_required', 'pending', 'sent', 'failed', 'no_recipient')),
  notification_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proposed_sale_split_totals_100 check (
    proposed_richard_pct + proposed_anastasia_pct + proposed_jean_claude_pct = 100
  ),
  constraint approved_sale_split_complete check (
    (status = 'pending' and approved_richard_pct is null and approved_anastasia_pct is null and approved_jean_claude_pct is null)
    or
    (status = 'approved' and approved_richard_pct + approved_anastasia_pct + approved_jean_claude_pct = 100)
  )
);

create table if not exists public.expenses (
  reference text primary key check (reference ~ '^[A-Z][A-Z0-9-]{1,39}$'),
  submitted_at timestamptz not null default now(),
  reporter text not null references public.employees(slug),
  description text not null,
  category text not null check (category in ('Materials', 'Travel', 'Other')),
  amount_cents bigint not null check (amount_cents > 0),
  proposed_allocation text not null check (proposed_allocation in ('A', 'B', 'OVERHEAD')),
  final_allocation text check (final_allocation in ('A', 'B', 'OVERHEAD')),
  status text not null check (status in ('awaiting_allocation', 'allocated')),
  source text not null check (source in ('website', 'telegram')),
  notification_chat_id text,
  sheet_sync_status text not null default 'pending' check (sheet_sync_status in ('pending', 'synced', 'failed')),
  sheet_sync_error text,
  notification_status text not null default 'pending' check (notification_status in ('not_required', 'pending', 'sent', 'failed', 'no_recipient')),
  notification_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expense_allocation_matches_status check (
    (status = 'awaiting_allocation' and final_allocation is null)
    or
    (status = 'allocated' and final_allocation is not null)
  )
);

create table if not exists public.telegram_updates (
  update_id bigint primary key,
  received_at timestamptz not null default now()
);

create table if not exists public.telegram_contacts (
  telegram_user_id text primary key,
  telegram_chat_id text not null,
  display_name text not null,
  updated_at timestamptz not null default now()
);

alter table public.employees enable row level security;
alter table public.sales enable row level security;
alter table public.expenses enable row level security;
alter table public.telegram_updates enable row level security;
alter table public.telegram_contacts enable row level security;

comment on table public.sales is 'Supabase source-of-truth sales records for Friends Included';
comment on table public.expenses is 'Supabase source-of-truth expense records for Friends Included';
