# Friends Included — Wedding Guests for Hire

Artjoms Bogomoļņikovs' Day 4 system-integration assignment. The application connects a role-based finance desk, a real Telegram bot, Supabase, and a readable Google Sheets review copy.

## What the system demonstrates

- Richard, Anastasia, and Jean-Claude can submit delivered-and-paid sales with a proposed split of the 10% commission pool.
- Kevin can submit paid expenses and propose Project A, Project B, or company-overhead allocation.
- Svetlana can approve sales, change commission splits, and make final expense-allocation decisions.
- Pending sales do not affect income or commission totals; paid expenses reduce the company result immediately.
- Supabase is the source of truth. Google Sheets is an automatically synchronized review copy with separate Sales and Expenses tabs.
- Telegram submitters receive the manager's final decision. Failed Sheets syncs and Telegram notifications remain visibly failed and can be retried.
- Duplicate references are rejected and Telegram webhook updates are processed once.

## Assessment control totals

With the supplied assessment dataset, the dashboard must show:

| Control | Expected result |
| --- | ---: |
| Project A result | €2,050.00 |
| Project B result | €2,180.00 |
| Company result | €3,930.00 |
| Richard commission | €140.00 |
| Anastasia commission | €175.00 |
| Jean-Claude commission | €215.00 |

Sale S05 stays pending and contributes zero income and zero earned commission. Expense E07 reduces the company result while it awaits final project allocation.

## Instructor walkthrough

1. Open the deployed app and use the **Demonstration role** selector.
2. As a salesperson, create a unique sale. Confirm it is visibly Pending and does not change the manager's financial totals.
3. As Kevin, create an expense. Confirm it reduces the company result immediately.
4. Switch to Svetlana, open **Decisions**, change a proposed split or allocation, and confirm the decision.
5. Open **Records** to compare proposal, final decision, Sheets status, and Telegram status.
6. Use the header links to inspect the real bot, Google Sheet, and source repository.
7. Attempt a duplicate reference or a forbidden action to verify validation and role enforcement.

## Telegram commands

Start the bot first. Svetlana then links the Telegram account to one fictional employee in **Bot setup**.

```text
/sale S01 | Olivia Rose | A | One proud uncle | 1000.00 | 50 | 30 | 20
/expense E01 | Materials | 120.00 | A | Rented suits
```

The bot explains the permitted command for the linked role and confirms only after the record is saved.

## Local development

Copy `.env.example` to `.env.local`, supply the private credentials, apply `supabase/schema.sql`, seed the fictional employees, and start the app.

```bash
pnpm install
pnpm run seed:employees
pnpm dev
```

After the public deployment exists, register its Telegram webhook:

```bash
pnpm run telegram:set-webhook
```

Validation commands:

```bash
pnpm test
pnpm run lint
pnpm run build
```

Private credentials are never committed. `.env.example` contains names only.
