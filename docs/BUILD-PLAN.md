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

## Phase F2 — Stock and buying · `COMPLETE`

### Step F2.1 — Suppliers · `DONE`
`SupplierList` — list, add, edit, deactivate, and a **Show inactive** toggle.
No delete: a supplier's name is on bills you have to keep, so deactivating just
takes them out of the dropdown.

### Step F2.2 — Purchase bills · `DONE`
`PurchaseList`, `PurchaseForm`, `PurchaseDetail`.

Each line on the form has a **Put this on the shelf as a piece** tick. Ticked, it
reveals the piece fields and the line becomes stock carrying what you paid.
Unticked, it is spend only — packaging, freight, tools.

A running total shows goods, VAT, TDS and what you owe, and an **On save** panel
says in words what is about to happen: *"2 pieces will appear in Jewellery, each
carrying what you paid for it."*

Verified end to end: a bill with one ring at 2,150 and one packaging line
produced a piece with `cost 2150` and no piece for the packaging. The jewellery
list stopped showing `not set` for it.

The detail page states plainly that a supplier bill cannot be edited or deleted,
because it is evidence.

### Step F2.3 — Jewellery form rebuild · `DONE`
Rebuilt to the mockup: Identity, Silver and making, Stone, Photo, with the live
**Selling price today** and **Margin check** panels on the right, recalculating
as you type.

Two deliberate differences from the mockup:

- **Cost price is read-only when editing.** It comes from the purchase bill the
  piece arrived on. A hand-typed cost that disagrees with the bill would make
  every margin a guess, so the panel explains where cost comes from instead of
  inviting one.
- **Status is read-only.** Sold and reserved are set by selling; retiring is on
  the detail page. Letting the form set them would let a piece be marked sold
  with no invoice behind it.

The **On save** panel warns that a piece added here has no bill behind it, and
points at Purchases instead.

### Step F2.4 — Stock check · `DONE`
`StockCheck` — a single count of disagreements, green at zero, with each problem
piece showing what the ledger says against what its status implies.

Pieces with **no ledger history at all** are listed separately and explained,
rather than flagged as errors: they predate the ledger or were added without a
bill, which is a gap in history, not a contradiction. Currently 1 such piece and
0 disagreements.

---

## Phase F3 — The books · `COMPLETE`

### Step F3.1 — Reports hub · `DONE`
`Reports.tsx` — **one page, nine reports**, a shared period picker and a
**Download CSV** button where the API supports it.

One page rather than nine routes because the period is the thing you change
most: pick a date range once and move between reports without re-entering it.

CSV needed a new `apiDownload()` in the API client. A plain `<a href>` cannot
carry the bearer token, so the browser would have been sent unauthenticated and
saved a `401` as the file.

### Step F3.2 — Ageing and stock valuation · `DONE`
Four bucket cards (current, 31–60, 61–90, over 90) above the detail, with the
over-90 card turning red when it has anything in it.

Stock valuation shows pieces, silver, value at cost, and **pieces with no cost
price** as its own amber figure — with a line saying plainly that those are not
counted, so the real stock is worth more than the number shown.

### Step F3.3 — Registers and VAT · `DONE`
Both registers with their tax split and a totals row; void invoices stay listed,
greyed and at zero.

The VAT return carries a **PAN only** pill and the explanation, plus how much
VAT was paid to suppliers that cannot be reclaimed — rather than a grid of
zeros with nothing to explain them.

### Step F3.4 — Ledger · `DONE`
`Ledger.tsx` — journal list, click any entry to see both sides, and the chart of
accounts. Trial balance lives in Reports with the rest.

**The manual entry form takes two accounts and one amount**, not a free line
editor. Phrased as *"the account receiving value"* and *"the account giving
value"* rather than debit and credit alone. It cannot produce an unbalanced
entry, because the same figure goes both ways by construction. Anything more
complex belongs with the accountant.

### Step F3.5 — Year end · `DONE`
Each fiscal year with its dates, status and whether its books balance — in
green, or in red with the exact difference.

Closing requires **typing the year's name**, and says what closing means before
you do. Reopening demands a reason, and says the reason is kept because an
auditor will ask.

---

## Phase F4 — Evidence and people · `COMPLETE`

### Step F4.1 — Receipt uploads · `DONE`
`components/admin/Documents.tsx` — a reusable panel listing what is attached and
taking another. Wired into **Purchase detail** (the paper bill) and
**Expense edit** (the receipt).

Upload and link happen in **one call**, so a file cannot end up stored but
attached to nothing — which is the same as not having it when someone asks.

On a *new* expense the panel does not appear: a receipt has to attach to
something, so the expense is saved first and the panel appears on edit.

### Step F4.2 — Users · `DONE`
`UserList.tsx`, admin only. Split into **Shop access** (admin and staff) and
**Shoppers** (storefront logins) — different problems, different actions.

Each role says in plain words what it reaches. Creating an account needed a new
`POST /api/users`: public signup only ever makes a customer, and access to the
books should be given by the owner rather than claimed by filling in a form.

Turning access off explains that the account stays, because the person's name is
on invoices. Erasing details requires typing `ERASE`.

**Permissions checked against a real staff login**, not assumed:

| Staff reach | Staff refused |
|---|---|
| invoices, customers, payments, purchases, suppliers, stock, stock check | users, reports, ledger, year end, creating a piece |

That check caught a real mistake: **staff could not see the jewellery
catalogue**, so they would have had nothing to sell from. Stock list, piece
detail and retiring a broken piece are now staff-level; creating and editing a
piece stays with the owner, since weight and making charge decide what the
customer is charged.

---

## Phase F5 — Finishing · `COMPLETE` (F5.3 still your call)

### Step F5.1 — Mobile pass · `DONE`
Audited every admin screen for tables that a phone would clip.

The list screens already swap to cards below `md`, so they were fine. The five
that show a table on a phone — Reports, Purchase detail, Jewellery movement,
the Ledger entry, Invoice lines — now use a shared `TableWrap` that scrolls
sideways. **A column of figures that silently loses its right-hand edge is worse
than one you have to swipe.**

### Step F5.2 — States · `DONE`
Every screen now waits the same way (`<Loading />`) — six were using their own
markup.

More importantly, **four screens showed nothing at all when a load failed**:
Dashboard, Invoices, Purchases and Stock check. An empty list looked exactly
like "you have no invoices", and the dashboard sat on *Loading…* for ever.
They now say what went wrong, and the empty state distinguishes *nothing yet*
from *could not load*.

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
| 2026-09-26 | — | **Phase F1 complete** bar the statutory print format. |
| 2026-09-26 | F2.1 | Suppliers list with deactivate. **DONE**. |
| 2026-09-26 | F2.2 | Purchase bills — list, form with per-line stock-in, detail. Cost price is real. **DONE**. |
| 2026-09-26 | F2.3 | Jewellery form rebuilt with live price and margin panels. **DONE**. |
| 2026-09-26 | F2.4 | Stock check surfacing ledger disagreements. **DONE**. |
| 2026-09-26 | — | **Phase F2 complete.** |
| 2026-09-26 | F3.1–F3.3 | Reports hub: 9 reports, shared period picker, authenticated CSV download. **DONE**. |
| 2026-09-26 | F3.4–F3.5 | Ledger with journal drill-down and manual entry; year-end close/reopen. **DONE**. |
| 2026-09-26 | bug | **Invoices were dated 5h45m in the future** — a local clock reading stored as UTC. Aged receivables silently showed nothing owed. Fixed, with two regression tests. |
| 2026-09-26 | bug | A customer test used a fixed phone number that collided with real data. It now generates its own. |
| 2026-09-26 | — | **Phase F3 complete.** 86 backend tests passing. |
| 2026-09-26 | F4.1 | Reusable receipt/bill attachment on purchases and expenses. **DONE**. |
| 2026-09-26 | F4.2 | Users screen + `POST /api/users`. **DONE**. |
| 2026-09-26 | fix | Staff could not see the jewellery catalogue — found by testing a real staff login. |
| 2026-09-26 | fix | Documents dated a second into the future: MySQL **rounds** fractional seconds. Milliseconds now dropped. |
| 2026-09-26 | — | **Phase F4 complete. No greyed-out tabs left.** |
| 2026-09-26 | F5.1 | `TableWrap` on the five screens showing tables on a phone. **DONE**. |
| 2026-09-26 | F5.2 | Consistent loading; four screens that failed silently now say so. **DONE**. |
| 2026-09-26 | bug | **Retired pieces were listed publicly for sale.** Public listing now shows only available/reserved. 88 tests. |
| 2026-09-26 | F5.3 | Storefront still switched off — your call. Two lines to re-enable. |
| 2026-09-26 | — | **All frontend phases complete** bar the two decisions (invoice print format, shop on/off). |
| 2026-09-26 | F6 | **Navigation rebuilt.** Sidebar is now five sections plus Settings, each a dropdown that opens to show its own screens. Selling, Invoices and Orders live together under **Sales**. Phone keeps a 5-slot bottom bar (Sell · Invoices · Stock · Money · More) and shows the open section's screens as a tab strip, since it has no sidebar. Money carries the pending-payment count. No routes changed. **DONE**. |
| 2026-09-26 | F7 | **Sales screen.** `/admin/invoices` is now the list of sales, each row carrying its invoice number and a *View invoice* link. **Enter new sale** opens the counter sale in a modal over the list instead of navigating away. The form was split into `CounterSaleForm` (modal or full page) so `/admin/invoices/new` still works for the phone's Sell tab and old bookmarks. New shared `Modal` component. Sidebar: Sales ▾ → All sales · Orders. **DONE**. |
| 2026-09-26 | F8 | **Sale entry: address, discount, levy.** Buyer address field (fills blanks on a returning buyer, never overwrites). Whole-bill discount split across pieces by price, last piece carrying the rounding. VAT line dropped; **skill promotional 0.5% charged on top** and shown on the sale form and the invoice. Figures that must add up now print to two decimals. **DONE**. |
| 2026-09-26 | F9 | **Orders rebuilt as a job.** Three tabs — All · Pending · Completed. **Take new order** opens a modal (pieces, buyer, delivery, payment). Each card lists its jewellery, linked to each piece, and either a **Make invoice** button or a link to the sale it became. Stage labels are the shop's words: Pending → Delivered → Sold. **DONE**. |
| 2026-09-26 | F10 | **Customers keyed on phone.** `customers.phone` is now UNIQUE (nulls still allowed, so a walk-in with no number keeps their own row). `findOrCreateByPhone` recovers from a duplicate-key race instead of failing a sale. New `GET /api/customers/:id/purchases` — every piece a buyer has taken home, read from invoice lines so it stays true years later. Sales list now carries `customerId`. **DONE**. |
| 2026-09-26 | F11 | **Jewellery list simplified.** Ten columns down to seven: SKU and Making moved off the table (SKU still searchable, shown under the name), category tucked under the name. **Edit** and **Delete** on every row and on the detail page. Delete is a soft delete — reason required, record kept, never offered for a sold piece. Days-in-stock can no longer read negative. **DONE**. |
| 2026-09-27 | F12 | **Deleting a piece is now undoable.** `POST /api/jewelries/:id/restore` puts a voided/damaged/lost piece back to available and writes the matching inbound stock row, so the two cancel and the count stays right. **Put back** button on the list and the piece's page. A sold piece is still not restorable — that is a credit note. **DONE**. |
| 2026-09-27 | F13 | **Purity options reworked** — 999, 99%, 98%, 925, plus **Other…** with a free box. |
| 2026-09-27 | bug | **Adding a piece by hand was completely broken.** `jewelries.sku` is NOT NULL UNIQUE and `createJewelry` never set it, so every save failed with `Field 'sku' doesn't have a default value`. A code is now generated from the category (`RIN-0001`) when none is typed, with a retry on collision and a plain message on a duplicate. |
| 2026-09-27 | bug | **SKU, material and purity were never saved.** The form collected all three and the payload carried none of them; the API ignored them too. All three now round-trip, and an edit that does not mention purity no longer clears it. |
| 2026-09-27 | bug | **A token outlived its account.** `authGate` checked only the signature, so a token for a deleted user passed and failed later as `Reference check failed` inside a write, and a *deactivated* user kept full access until their token expired. The account is now looked up on every request, and the role is read from it rather than the token. Six tests. |
