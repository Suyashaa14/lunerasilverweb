# Lunera Silver — Admin UI Build Plan

Companion to `lunerasilver-api/docs/BUILD-PLAN.md`. Same rules: one step per
session, do only that step, verify against **Done when**, update the status and
add a Changelog line.

**Started:** 2026-09-26
**Scope:** `lunerasilverweb` (admin UI, and the storefront where it is affected)

| Mark | Meaning |
|---|---|
| `TODO` | not started |
| `WIP` | in progress |
| `DONE` | finished and verified |
| `BLOCKED` | waiting on a decision |

---

## Current state (verified 2026-09-26)

### What the UI already has

Seven tabs: Dashboard · Jewelries · Orders · Invoices · Expenses · Analytics ·
Settings.

Rebuilt during the backend work, not starting from scratch:

- **Dashboard** — period selector, shop counter, net-profit trend, alerts panel,
  online-store block. Desktop and mobile.
- **Jewellery list** — totals strip, silver rate, five filters, stale flagging.
- **Jewellery detail** — source bill, margin, stock ledger, where it appears.
- **Invoices** — list, counter sale, invoice detail with payment and credit note.
- **Alerts panel** — severity dots, action links, "updated" time.
- **Expenses** — Delete became Void.
- **Auth** — bearer token in localStorage, no `/auth/me` round trip.

### The gap

**Nine backend modules have no screen at all.** Everything below exists, is
tested, and is reachable only with curl:

| Module | What it does | UI |
|---|---|---|
| `customers` | the buyer on every invoice | **none** |
| `suppliers` | who you buy from | **none** |
| `purchases` | supplier bills — **where cost price comes from** | **none** |
| `payments` | verify/reject pending money, refunds | partial (take payment only) |
| `reports` | P&L, balance sheet, ageing, stock, registers, VAT | **none** |
| `ledger` | trial balance, journal entries, chart of accounts | **none** |
| `periods` | closing a fiscal year | **none** |
| `inventory` | stock reconcile check | partial (movements shown) |
| `documents` | receipt and bill uploads | **none** |
| `users` | staff accounts, roles, deactivation | **none** |

The most costly gap is **purchases**. Without that screen there is no way to
enter a supplier bill, so no piece gets a cost price, so every margin the
system reports stays at zero — the exact problem Phase 2 of the backend was
built to fix.

---

## Open questions

| # | Question | Blocks |
|---|---|---|
| F1 | Does IRD require a prescribed invoice layout? (backend D3) | **F1.3** invoice print |
| F2 | Do AML rules apply, and above what value must customer ID be captured? (backend D5) | F4.1 customer form |
| F3 | Should the storefront shop page be switched back on? It is commented out in `App.tsx`, so customers cannot browse at all right now. | F5.3 |

---

## Proposed navigation

Seven flat tabs will not hold seventeen screens. Grouped sidebar:

```
DAILY          Dashboard
               Sell            (counter sale)
               Invoices
               Orders          (online)

STOCK          Jewellery
               Purchases
               Suppliers

MONEY          Payments
               Expenses

PEOPLE         Customers

BOOKS          Reports         (P&L, balance sheet, ageing, stock, registers, VAT)
               Ledger          (trial balance, journal entries, accounts)
               Year end        (close / reopen a fiscal year)

ADMIN          Settings
               Users
```

**BOOKS and ADMIN are admin-only.** Staff see DAILY, STOCK, MONEY and PEOPLE —
matching `authenticateStaff` on the API, so the menu never offers something the
server will refuse.

---

## Phase F0 — Foundation · `COMPLETE`

### Step F0.1 — Grouped, role-aware sidebar · `DONE`
Six sections: Daily, Stock, Money, People, Books, Admin. **Books and Admin are
hidden unless `user.role === 'admin'`**, mirroring `authenticateAdmin` on the
API, so the menu never offers something the server will refuse.

Screens not built yet are **shown greyed out and inert** rather than hidden. The
shape of the app is then obvious, and nobody clicks into a dead route. Remove
the `soon` flag as each one lands.

The signed-in role now appears under the email, so it is clear what a login can
do without guessing.

### Step F0.2 — Shared UI pieces · `DONE`
`src/components/admin/`:

- **`format.ts`** — `num` (whole rupees), `money` (two decimals, where the
  arithmetic is shown and must add up on the page), `grams`, dates,
  `relativeTime`. The same four one-line formatters had been copy-pasted across
  six screens with two different rounding rules between them.
- **`ui.tsx`** — `Card`, `CardHead`, `Figure`, `StatCell`, `StatusPill`,
  `SEVERITY_DOT`, `PageHeader`, `EmptyState`, `Loading`, `ErrorNote`, `BUTTON`.
  Markup is byte-identical to what the screens already had, so nothing moved.

`STATUS_STYLE` is now one map. A piece marked `sold` looks the same on the list,
the detail page and every screen added later — it had been defined separately in
four files.

**No generic `DataTable`.** The three existing tables differ enough that a
shared one would take more options than it saves. Revisit once the Phase F3
report tables exist and the real pattern is visible.

### Step F0.3 — Real dialogs · `DONE`
`Dialog.tsx` — a `useDialog()` hook returning a promise, and a modal with typed
fields (text, textarea, select, number), required-field validation, Escape and
backdrop to cancel, autofocus, and a danger variant.

**Eight browser prompts replaced** across four screens: take payment, void
invoice, credit note, retire piece (list and detail), void expense.

What that buys, beyond looks:
- **Retiring a piece is now a dropdown**, not typing `damaged` / `lost` /
  `voided` correctly into a prompt.
- **Taking a payment picks its method**, and says that cash counts immediately
  while anything else waits for a statement. The old prompt silently reused the
  invoice's method.
- **The credit-note refund is an explicit choice**, not a second `confirm()`.
- Failures now land in the page's error area instead of an `alert()`.

`prompt(`, `confirm(` and `alert(` no longer appear anywhere in
`src/pages/admin`.

---

## Phase F1 — Close the daily loop · `COMPLETE` (F1.3 partial)

### Step F1.1 — Customers · `DONE`
`CustomerList` (search by name, phone or email; add) and `CustomerDetail`
(contact details, three totals — invoices, spent, **still owes** — and their
whole invoice history with per-invoice outstanding).

Needed one backend addition: `GET /api/invoices?customerId=`. Without it the
detail page would have had to pull every invoice and filter in the browser.

Verified with real data: a part-paid invoice shows `total 2480.50 · paid 500 ·
owes 1980.50` on the customer's page, without opening the invoice.

### Step F1.2 — Payments · `DONE`
`PaymentList` with four tabs — **Needs checking**, Confirmed, Rejected, All —
and a count badge on the first. Confirm and Reject act on a pending row;
rejecting demands a reason.

Two backend additions: `GET /api/payments?status=` and
`GET /api/payments/pending-count`. The list now carries the **invoice number and
buyer name** on every row, because a queue of bare amounts cannot be checked
against a bank statement.

Verified: a 700 bank transfer sat in Needs checking with its reference
`TXN-99812`, confirming it moved the invoice balance from 500 paid to 1,200.

**Why this screen matters.** Cash is counted the moment it is taken. Everything
else — eSewa, bank transfer — waits as pending until somebody checks it against
a statement, and until now nothing anywhere surfaced that. Money could sit
unconfirmed indefinitely with no way to notice.

### Step F1.3 — Invoice print layout · `BLOCKED (F1)` — partially improved

Still blocked on whether IRD prescribes a format.

**Done anyway, because it cannot be wasted:** a print stylesheet in `index.css`.
Printing an invoice was printing the entire admin shell — sidebar, menu button
and action buttons all landed on the customer's copy. Those are now hidden, the
page prints full width, and cards no longer break across pages.

What is still outstanding is the **content and wording** a compliant Nepali tax
invoice must carry. That is the part worth asking about before building.

---

## Phase F2 — Stock and buying

### Step F2.1 — Suppliers · `TODO`
List, create, edit, deactivate. Small, and F2.2 needs it.

### Step F2.2 — Purchase bills · `TODO`
**The most valuable screen in this plan.** List, and a new-bill form whose lines
can each book a piece into stock. **Done when** entering a supplier bill creates
the pieces with their cost price, and the jewellery list stops showing
`not set` in red.

### Step F2.3 — Jewellery form rebuild · `TODO`
Per the approved mockup: identity, silver and making, stone, cost and source
(linked to a purchase bill line), photo, with the live **Selling price today**
and **Margin check** panels.
**Done when** the price panel matches the piece's detail page to the rupee.

### Step F2.4 — Stock check · `TODO`
Surface `GET /api/inventory/reconcile` — any piece whose ledger disagrees with
its status. **Done when** a disagreement is visible without curl.

---

## Phase F3 — The books

### Step F3.1 — Reports hub · `TODO`
One page, period picker, links to each report. Profit and loss and balance sheet
first, each with a **Download CSV** button (`?format=csv` already works).

### Step F3.2 — Ageing and stock valuation · `TODO`
Aged receivables and payables with their buckets; stock at cost, flagging pieces
with no cost price.

### Step F3.3 — Registers and VAT · `TODO`
Sales and purchase registers, and the VAT return. The VAT page must show the
PAN-only message rather than a grid of zeros with no explanation.

### Step F3.4 — Ledger · `TODO`
Trial balance with its debits-equal-credits proof, journal entry list and drill
down, chart of accounts, and a manual journal entry form that refuses to submit
unless it balances.

### Step F3.5 — Year end · `TODO`
Period list with status, close and reopen. Closing must show the trial balance
and refuse if it does not balance. Reopening must demand a reason.

---

## Phase F4 — Evidence and people

### Step F4.1 — Receipt uploads · `TODO`
Attach a photo to an expense or a purchase bill, and show it on the record.

### Step F4.2 — Users · `TODO`
Staff list, invite, role change, deactivate, anonymise. Admin only.

---

## Phase F5 — Finishing

### Step F5.1 — Mobile pass · `TODO`
Every new screen at phone width. The shop counter is used standing up.

### Step F5.2 — States · `TODO`
Consistent loading, empty and error states. Several screens currently show a
bare "Loading…" and nothing on failure.

### Step F5.3 — Storefront · `BLOCKED (F3)`
The shop route is commented out in `App.tsx`, so customers cannot browse.
Pricing also changed — stone price is now included and the Rs 50 rounding is
gone — so storefront prices moved. Decide whether the shop is switched back on
before worrying about how it looks.

---

## Changelog

| Date | Step | Note |
|---|---|---|
| 2026-09-26 | — | Plan created. Nine backend modules have no UI; purchases is the costliest gap. |
| 2026-09-26 | F0.2 | Shared `format.ts` and `ui.tsx`; one `STATUS_STYLE` replacing four copies. **DONE**. |
| 2026-09-26 | F0.3 | `Dialog.tsx`; 8 browser prompts replaced across 4 screens. **DONE**. |
| 2026-09-26 | F0.1 | Grouped role-aware sidebar; unbuilt screens greyed out. **DONE**. |
| 2026-09-26 | — | **Phase F0 complete.** |
| 2026-09-26 | F1.1 | Customers list + detail with outstanding balance. Backend: `?customerId=`. **DONE**. |
| 2026-09-26 | F1.2 | Payments queue with confirm/reject. Backend: `?status=`, `/pending-count`. **DONE**. |
| 2026-09-26 | F1.3 | Print stylesheet — the admin shell no longer prints onto invoices. Format still blocked. |
| 2026-09-26 | — | **Phase F1 complete** bar the statutory print format. Next: F2.1 → F2.2. |
