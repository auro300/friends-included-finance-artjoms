"use client";

import { FormEvent, useEffect, useState } from "react";
import { EMPLOYEES } from "@/lib/employees";
import type { Allocation, CommissionSplit, EmployeeSlug, Expense, FinancialSummary, Sale } from "@/lib/types";

type View = "dashboard" | "submit" | "decisions" | "records" | "telegram";
type DashboardData = {
  role: EmployeeSlug;
  sales: Sale[];
  expenses: Expense[];
  summary: FinancialSummary | null;
  employees: Array<{ slug: EmployeeSlug; display_name: string; role: string; telegram_user_id: string | null; telegram_chat_id: string | null }>;
  telegramContacts: Array<{ telegram_user_id: string; telegram_chat_id: string; display_name: string; updated_at: string }>;
};

const roleOptions = Object.entries(EMPLOYEES) as Array<[EmployeeSlug, (typeof EMPLOYEES)[EmployeeSlug]]>;

async function fetchDashboard(role: EmployeeSlug) {
  const response = await fetch(`/api/state?role=${encodeURIComponent(role)}`, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Could not load records.");
  return payload as DashboardData;
}

function money(cents: number) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(cents / 100);
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Riga" }).format(new Date(value));
}

function allocationName(value: Allocation | null) {
  if (value === "A") return "Respectable Relatives";
  if (value === "B") return "Drunk University Friends";
  if (value === "OVERHEAD") return "Company overhead";
  return "Awaiting decision";
}

function Status({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "good" | "warn" | "bad" | "neutral" }) {
  return <span className={`status status-${tone}`}>{children}</span>;
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  if (!href) return <span className="external-link disabled">{children} · connecting</span>;
  return <a className="external-link" href={href} target="_blank" rel="noreferrer">{children} ↗</a>;
}

function Metric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={emphasis ? "metric metric-emphasis" : "metric"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function FinanceDesk({ links }: { links: { telegram: string; sheet: string; github: string } }) {
  const [role, setRole] = useState<EmployeeSlug>("svetlana");
  const [view, setView] = useState<View>("dashboard");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setData(await fetchDashboard(role));
    } catch (loadError) {
      setData(null);
      setError(loadError instanceof Error ? loadError.message : "Could not load records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetchDashboard(role)
      .then((payload) => { if (active) setData(payload); })
      .catch((loadError: unknown) => { if (active) { setData(null); setError(loadError instanceof Error ? loadError.message : "Could not load records."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [role]);

  function changeRole(nextRole: EmployeeSlug) {
    const roleType = EMPLOYEES[nextRole].role;
    setView(roleType === "manager" ? "dashboard" : "submit");
    setNotice("");
    setError("");
    setData(null);
    setLoading(true);
    setRole(nextRole);
  }

  async function mutate(path: string, body: unknown) {
    setError("");
    setNotice("");
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-demonstration-role": role },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "The action failed.");
    await refresh();
    return payload;
  }

  async function runAction(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      setNotice(success);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The action failed.");
    }
  }

  const availableViews: View[] = EMPLOYEES[role].role === "manager"
    ? ["dashboard", "decisions", "records", "telegram"]
    : ["submit", "records"];

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Friends Included finance desk home">
          <span className="brand-mark">FI</span>
          <span><b>Friends Included</b><small>Finance desk</small></span>
        </a>
        <div className="header-links">
          <ExternalLink href={links.telegram}>Telegram</ExternalLink>
          <ExternalLink href={links.sheet}>Google Sheet</ExternalLink>
          <ExternalLink href={links.github}>GitHub</ExternalLink>
        </div>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">Wedding guests for hire · Day 4 homework</p>
          <h1>Every friendship expires at checkout.</h1>
          <p className="hero-copy">Sales, commissions, paid expenses, and manager decisions—connected from Telegram to the final company result.</p>
          <p className="author">Built by Artjoms Bogomoļņikovs</p>
        </div>
        <div className="role-panel">
          <label htmlFor="demonstration-role">Demonstration role</label>
          <select id="demonstration-role" value={role} onChange={(event) => changeRole(event.target.value as EmployeeSlug)}>
            {roleOptions.map(([slug, employee]) => <option key={slug} value={slug}>{employee.displayName} · {employee.role}</option>)}
          </select>
          <p>Fictional access for assessment. Permissions are enforced again when each action reaches the server.</p>
        </div>
      </section>

      <section className="instructions" aria-labelledby="instructions-title">
        <div>
          <p className="section-number">01</p>
          <h2 id="instructions-title">How this desk works</h2>
        </div>
        <p>Salespeople report delivered and paid sales. Kevin reports paid expenses. Svetlana checks proposals, changes decisions when needed, and approves them. Supabase keeps the official records; Google Sheets is the readable review copy.</p>
      </section>

      <nav className="desk-nav" aria-label="Finance desk sections">
        {availableViews.map((item) => (
          <button key={item} type="button" className={view === item ? "active" : ""} onClick={() => setView(item)}>
            {item === "telegram" ? "Bot setup" : item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </nav>

      {notice && <div className="notice success" role="status">{notice}</div>}
      {error && <div className="notice failure" role="alert"><b>Action needed:</b> {error}</div>}
      {loading && <div className="loading" role="status">Updating the finance desk…</div>}

      {!loading && view === "dashboard" && data?.summary && <Dashboard summary={data.summary} />}
      {!loading && view === "submit" && (
        EMPLOYEES[role].role === "sales"
          ? <SaleForm onSubmit={(body) => runAction(() => mutate("/api/sales", body), "Sale saved as Pending approval.")} />
          : <ExpenseForm onSubmit={(body) => runAction(() => mutate("/api/expenses", body), "Expense saved successfully.")} />
      )}
      {!loading && view === "decisions" && data && <Decisions data={data} mutate={mutate} runAction={runAction} />}
      {!loading && view === "records" && data && <Records data={data} role={role} mutate={mutate} runAction={runAction} />}
      {!loading && view === "telegram" && data && <TelegramSetup data={data} mutate={mutate} runAction={runAction} botUrl={links.telegram} />}

      <footer>
        <span>Fictional demonstration data</span>
        <span>Supabase is the source of truth</span>
      </footer>
    </main>
  );
}

function Dashboard({ summary }: { summary: FinancialSummary }) {
  const companyChecks = summary.projects.A.resultCents + summary.projects.B.resultCents - summary.company.overheadCents - summary.company.awaitingAllocationCents;
  return (
    <section className="workspace" aria-labelledby="dashboard-title">
      <div className="section-heading">
        <div><p className="section-number">02</p><h2 id="dashboard-title">Financial dashboard</h2></div>
        <Status tone={companyChecks === summary.company.resultCents ? "good" : "bad"}>Reconciled</Status>
      </div>
      <div className="project-grid">
        {(["A", "B"] as const).map((project) => (
          <article className="project-panel" key={project}>
            <p className="project-code">Project {project}</p>
            <h3>{project === "A" ? "Respectable Relatives" : "Drunk University Friends"}</h3>
            <Metric label="Approved income" value={money(summary.projects[project].approvedIncomeCents)} />
            <Metric label="Commission expense" value={money(summary.projects[project].commissionExpenseCents)} />
            <Metric label="Allocated expenses" value={money(summary.projects[project].allocatedExpenseCents)} />
            <Metric label="Result" value={money(summary.projects[project].resultCents)} emphasis />
          </article>
        ))}
        <article className="project-panel company-panel">
          <p className="project-code">Whole company</p>
          <h3>All friendships combined</h3>
          <Metric label="Approved income" value={money(summary.company.approvedIncomeCents)} />
          <Metric label="All commissions" value={money(summary.company.commissionExpenseCents)} />
          <Metric label="All recorded expenses" value={money(summary.company.totalExpenseCents)} />
          <Metric label="Result" value={money(summary.company.resultCents)} emphasis />
        </article>
      </div>
      <div className="commission-strip">
        <div><span>Richard</span><strong>{money(summary.commissionEarned.richardCents)}</strong></div>
        <div><span>Anastasia</span><strong>{money(summary.commissionEarned.anastasiaCents)}</strong></div>
        <div><span>Jean-Claude</span><strong>{money(summary.commissionEarned.jeanClaudeCents)}</strong></div>
        <p>Project A + Project B − {money(summary.company.overheadCents)} overhead − {money(summary.company.awaitingAllocationCents)} awaiting allocation = {money(summary.company.resultCents)}</p>
      </div>
    </section>
  );
}

function SaleForm({ onSubmit }: { onSubmit: (body: unknown) => Promise<void> }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onSubmit({
      reference: form.get("reference"), customer: form.get("customer"), project: form.get("project"), description: form.get("description"),
      amountCents: Math.round(Number(form.get("amount")) * 100),
      split: { richard: Number(form.get("richard")), anastasia: Number(form.get("anastasia")), jeanClaude: Number(form.get("jeanClaude")) },
    });
    event.currentTarget.reset();
  }
  return (
    <section className="workspace narrow" aria-labelledby="sale-title">
      <div className="section-heading"><div><p className="section-number">02</p><h2 id="sale-title">Report a delivered sale</h2></div><Status tone="warn">Starts pending</Status></div>
      <form className="entry-form" onSubmit={submit}>
        <label>Unique reference<input name="reference" placeholder="S01" required /></label>
        <label>Customer<input name="customer" placeholder="Olivia Rose" required /></label>
        <label>Project<select name="project" defaultValue="A"><option value="A">A · Respectable Relatives</option><option value="B">B · Drunk University Friends</option></select></label>
        <label>Amount in euros<input name="amount" type="number" min="0.01" step="0.01" placeholder="1000.00" required /></label>
        <label className="full">Description<textarea name="description" rows={3} placeholder="One proud uncle and an emotional grandmother" required /></label>
        <fieldset className="split-fields full"><legend>Proposed share of the 10% commission pool</legend>
          <label>Richard %<input name="richard" type="number" min="0" max="100" step="0.01" defaultValue="50" required /></label>
          <label>Anastasia %<input name="anastasia" type="number" min="0" max="100" step="0.01" defaultValue="30" required /></label>
          <label>Jean-Claude %<input name="jeanClaude" type="number" min="0" max="100" step="0.01" defaultValue="20" required /></label>
        </fieldset>
        <button className="primary full" type="submit">Save pending sale</button>
      </form>
    </section>
  );
}

function ExpenseForm({ onSubmit }: { onSubmit: (body: unknown) => Promise<void> }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onSubmit({
      reference: form.get("reference"), category: form.get("category"), amountCents: Math.round(Number(form.get("amount")) * 100),
      proposedAllocation: form.get("allocation"), description: form.get("description"),
    });
    event.currentTarget.reset();
  }
  return (
    <section className="workspace narrow" aria-labelledby="expense-title">
      <div className="section-heading"><div><p className="section-number">02</p><h2 id="expense-title">Report a paid expense</h2></div><Status tone="warn">Reduces company now</Status></div>
      <form className="entry-form" onSubmit={submit}>
        <label>Unique reference<input name="reference" placeholder="E01" required /></label>
        <label>Amount in euros<input name="amount" type="number" min="0.01" step="0.01" placeholder="120.00" required /></label>
        <label>Category<select name="category"><option>Materials</option><option>Travel</option><option>Other</option></select></label>
        <label>Proposed allocation<select name="allocation"><option value="A">A · Respectable Relatives</option><option value="B">B · Drunk University Friends</option><option value="OVERHEAD">Company overhead</option></select></label>
        <label className="full">Description<textarea name="description" rows={3} placeholder="Rented suit and fake pearl necklace for the relatives" required /></label>
        <button className="primary full" type="submit">Save expense</button>
      </form>
    </section>
  );
}

function Decisions({ data, mutate, runAction }: { data: DashboardData; mutate: (path: string, body: unknown) => Promise<unknown>; runAction: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  const pendingSales = data.sales.filter((sale) => sale.status === "pending");
  const pendingExpenses = data.expenses.filter((expense) => expense.status === "awaiting_allocation");
  return (
    <section className="workspace" aria-labelledby="decision-title">
      <div className="section-heading"><div><p className="section-number">02</p><h2 id="decision-title">Manager decisions</h2></div><Status tone={pendingSales.length + pendingExpenses.length ? "warn" : "good"}>{pendingSales.length + pendingExpenses.length} waiting</Status></div>
      <div className="decision-columns">
        <div><h3>Sales awaiting approval</h3>{pendingSales.length ? pendingSales.map((sale) => <SaleDecision key={sale.reference} sale={sale} onApprove={(split) => runAction(() => mutate(`/api/manager/sales/${sale.reference}`, { split }), `${sale.reference} approved and synchronized.`)} />) : <p className="empty">No sales are waiting.</p>}</div>
        <div><h3>Expenses awaiting allocation</h3>{pendingExpenses.length ? pendingExpenses.map((expense) => <ExpenseDecision key={expense.reference} expense={expense} onAllocate={(allocation) => runAction(() => mutate(`/api/manager/expenses/${expense.reference}`, { allocation }), `${expense.reference} allocated and synchronized.`)} />) : <p className="empty">No expenses are waiting.</p>}</div>
      </div>
    </section>
  );
}

function SaleDecision({ sale, onApprove }: { sale: Sale; onApprove: (split: CommissionSplit) => Promise<void> }) {
  const [split, setSplit] = useState(sale.proposedSplit);
  const total = split.richard + split.anastasia + split.jeanClaude;
  return (
    <article className="decision-card">
      <div className="decision-top"><div><b>{sale.reference}</b><span>{EMPLOYEES[sale.salesperson].displayName}</span></div><strong>{money(sale.amountCents)}</strong></div>
      <p>{sale.customer} · Project {sale.project}</p><p className="muted">{sale.description}</p>
      <div className="mini-split">
        {(["richard", "anastasia", "jeanClaude"] as const).map((person) => <label key={person}>{person === "jeanClaude" ? "Jean-Claude" : person[0].toUpperCase() + person.slice(1)} %<input type="number" min="0" max="100" value={split[person]} onChange={(event) => setSplit({ ...split, [person]: Number(event.target.value) })} /></label>)}
      </div>
      <div className="decision-footer"><span className={total === 100 ? "total-valid" : "total-invalid"}>Total {total}%</span><button className="primary" type="button" disabled={total !== 100} onClick={() => onApprove(split)}>Approve sale</button></div>
    </article>
  );
}

function ExpenseDecision({ expense, onAllocate }: { expense: Expense; onAllocate: (allocation: Allocation) => Promise<void> }) {
  const [allocation, setAllocation] = useState<Allocation>(expense.proposedAllocation);
  return (
    <article className="decision-card">
      <div className="decision-top"><div><b>{expense.reference}</b><span>{expense.category}</span></div><strong>{money(expense.amountCents)}</strong></div>
      <p>{expense.description}</p><p className="muted">Proposed: {allocationName(expense.proposedAllocation)}</p>
      <label>Final allocation<select value={allocation} onChange={(event) => setAllocation(event.target.value as Allocation)}><option value="A">A · Respectable Relatives</option><option value="B">B · Drunk University Friends</option><option value="OVERHEAD">Company overhead</option></select></label>
      <div className="decision-footer"><span>{allocation === expense.proposedAllocation ? "Proposal retained" : "Decision changed"}</span><button className="primary" type="button" onClick={() => onAllocate(allocation)}>Confirm allocation</button></div>
    </article>
  );
}

function Records({ data, role, mutate, runAction }: { data: DashboardData; role: EmployeeSlug; mutate: (path: string, body: unknown) => Promise<unknown>; runAction: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  const manager = EMPLOYEES[role].role === "manager";
  return (
    <section className="workspace" aria-labelledby="records-title">
      <div className="section-heading"><div><p className="section-number">02</p><h2 id="records-title">{manager ? "All records" : "My records"}</h2></div><Status>{data.sales.length + data.expenses.length} entries</Status></div>
      {data.sales.length > 0 && <RecordTable title="Sales"><thead><tr><th>Reference</th><th>Person / customer</th><th>Project / amount</th><th>Proposal</th><th>Final / earned</th><th>Status</th></tr></thead><tbody>{data.sales.map((sale) => <tr key={sale.reference}><td><b>{sale.reference}</b><small>{dateTime(sale.submittedAt)}</small></td><td>{EMPLOYEES[sale.salesperson].displayName}<small>{sale.customer}</small></td><td>Project {sale.project}<small>{money(sale.amountCents)}</small></td><td>{sale.proposedSplit.richard}/{sale.proposedSplit.anastasia}/{sale.proposedSplit.jeanClaude}%</td><td>{sale.approvedSplit && sale.commissions ? <>{sale.approvedSplit.richard}/{sale.approvedSplit.anastasia}/{sale.approvedSplit.jeanClaude}%<small>{money(sale.commissions.richardCents)} · {money(sale.commissions.anastasiaCents)} · {money(sale.commissions.jeanClaudeCents)}</small></> : "—"}</td><td><Status tone={sale.status === "approved" ? "good" : "warn"}>{sale.status}</Status><small>Sheets {sale.sheetSyncStatus} · Telegram {sale.notificationStatus}</small>{manager && sale.sheetSyncStatus === "failed" && <button className="text-button" onClick={() => runAction(() => mutate(`/api/retry/sale/${sale.reference}`, {}), `${sale.reference} synchronized.`)}>Retry Sheets</button>}{manager && sale.notificationStatus === "failed" && <button className="text-button" onClick={() => runAction(() => mutate(`/api/retry/notification/sale/${sale.reference}`, {}), `${sale.reference} notification sent.`)}>Retry Telegram</button>}</td></tr>)}</tbody></RecordTable>}
      {data.expenses.length > 0 && <RecordTable title="Expenses"><thead><tr><th>Reference</th><th>Description</th><th>Category / amount</th><th>Proposed</th><th>Final</th><th>Status</th></tr></thead><tbody>{data.expenses.map((expense) => <tr key={expense.reference}><td><b>{expense.reference}</b><small>{dateTime(expense.submittedAt)}</small></td><td>{expense.description}</td><td>{expense.category}<small>{money(expense.amountCents)}</small></td><td>{allocationName(expense.proposedAllocation)}</td><td>{allocationName(expense.finalAllocation)}</td><td><Status tone={expense.status === "allocated" ? "good" : "warn"}>{expense.status.replaceAll("_", " ")}</Status><small>Sheets {expense.sheetSyncStatus} · Telegram {expense.notificationStatus}</small>{manager && expense.sheetSyncStatus === "failed" && <button className="text-button" onClick={() => runAction(() => mutate(`/api/retry/expense/${expense.reference}`, {}), `${expense.reference} synchronized.`)}>Retry Sheets</button>}{manager && expense.notificationStatus === "failed" && <button className="text-button" onClick={() => runAction(() => mutate(`/api/retry/notification/expense/${expense.reference}`, {}), `${expense.reference} notification sent.`)}>Retry Telegram</button>}</td></tr>)}</tbody></RecordTable>}
      {!data.sales.length && !data.expenses.length && <p className="empty">No records are visible for this role yet.</p>}
    </section>
  );
}

function RecordTable({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="record-block"><h3>{title}</h3><div className="table-scroll"><table>{children}</table></div></div>;
}

function TelegramSetup({ data, mutate, runAction, botUrl }: { data: DashboardData; mutate: (path: string, body: unknown) => Promise<unknown>; runAction: (action: () => Promise<unknown>, success: string) => Promise<void>; botUrl: string }) {
  const [contactId, setContactId] = useState(data.telegramContacts[0]?.telegram_user_id ?? "");
  const [employee, setEmployee] = useState<EmployeeSlug>("richard");
  const contact = data.telegramContacts.find((item) => item.telegram_user_id === contactId);
  return (
    <section className="workspace narrow" aria-labelledby="telegram-title">
      <div className="section-heading"><div><p className="section-number">02</p><h2 id="telegram-title">Telegram manager setup</h2></div><ExternalLink href={botUrl}>Open bot</ExternalLink></div>
      <p className="lead">Ask the employee to start the bot. Their Telegram identity appears here; only Svetlana can assign it to a fictional role. Older submissions retain their original notification chat.</p>
      {data.telegramContacts.length ? <form className="entry-form" onSubmit={(event) => { event.preventDefault(); if (contact) void runAction(() => mutate("/api/telegram/link", { employee, telegramUserId: contact.telegram_user_id, telegramChatId: contact.telegram_chat_id }), `${contact.display_name} linked to ${EMPLOYEES[employee].displayName}.`); }}>
        <label className="full">Telegram contact<select value={contactId} onChange={(event) => setContactId(event.target.value)}>{data.telegramContacts.map((item) => <option key={item.telegram_user_id} value={item.telegram_user_id}>{item.display_name} · ID {item.telegram_user_id}</option>)}</select></label>
        <label className="full">Assign fictional employee<select value={employee} onChange={(event) => setEmployee(event.target.value as EmployeeSlug)}>{roleOptions.map(([slug, item]) => <option key={slug} value={slug}>{item.displayName}</option>)}</select></label>
        <button className="primary full" type="submit">Save Telegram link</button>
      </form> : <p className="empty">No Telegram users have started the bot yet.</p>}
      <div className="linked-list"><h3>Current links</h3>{data.employees.map((item) => <div key={item.slug}><span>{item.display_name}</span><b>{item.telegram_user_id ? `ID ${item.telegram_user_id}` : "Not linked"}</b></div>)}</div>
    </section>
  );
}
