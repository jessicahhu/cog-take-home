# Toolboard

A whiteboard-style builder for internal tools. Drag executable feature blocks onto the board, wire them together so data flows between them, then **Compile & Run** to use the tool you built.

## Features

- **Executable blocks** — every block is a working component at runtime: forms submit real records, tables/lists/charts/KPIs render live data, queues approve/reject cases, refunds and payments move money, feature flags toggle, and the audit log records everything
- **Links (data flow)** — drag from a block's right-side output port ◉ to another block to wire them together (e.g. Form → Data Table, Payment → Balance, Review Queue → Audit Log); incompatible links are rejected with an explanation
- **Compile & Run** — validates the block graph (broken or incompatible links are errors, unlinked sinks are warnings) and launches the tool in a runtime view where every block is live
- **Sitemap** — structure a tool into multiple pages from the left panel; the runtime shows them as navigation tabs
- **Configurable blocks** — every block type is editable: select it and the Inspector (top of the right panel) edits what it actually does — form fields (add/remove/rename, type, required, select options), submit and button labels, table columns, rows/bars shown, starting rows for queues/feeds/tables/connectors (title, amount, status), KPI metric, starting balance, note text, search placeholder, customer name/email/KYC, card number/expiry, bank name, feature-flag names, Slack channel, email recipient, webhook URL, and SQL — all saved with the tool
- **Backend selector** — choose where runtime data lives: in-memory, browser storage (persists between runs), or an HTTPS endpoint you own — plain REST, AWS (API Gateway + Lambda), or Azure (Functions); see [Persisting data](#persisting-data)
- **Fintech blocks** — balance card, transaction feed, payment form, virtual card, and bank-account linking
- **Internal ops blocks** — building blocks drawn from real internal tools (KYC review queues, refunds dashboards, feature-flag admin panels): customer info, review queue, refund action, feature flags, and audit log
- **Connectors** — external app/data blocks: Stripe Payments, Postgres Query, and Google Sheet emit seeded records into the graph (with sync/query buttons that pull more), while Slack Notify, Email Sender, and Webhook Out are sinks that surface linked activity as channel messages, sent emails, or real HTTP POSTs to a URL you enter (connectors are safe browser-side demos — no credentials involved)
- **Auth & roles** — toggle “Require sign-in” in the Access section to gate the compiled tool behind a sign-in screen with demo users (`admin`/`admin`, `ops`/`ops`, `viewer`/`viewer`); every page and block has a role badge (All / Ops / Adm) — pages and blocks above the signed-in user's role are hidden at runtime. With sign-in on, **“Only admins see submitted records”** (on by default) hides record contents — tables, lists, queues, feeds, audit logs, customer info and connector output — from non-admins, while forms and other actions stay usable, so a viewer can submit without seeing anyone's submissions. Any of those blocks can override this with “Who sees records” in the Inspector
- **Devin chat** — the panel on the right does three things:
  - **Builds** — "a vendor onboarding form with company name, tax id and contact email" creates the blocks, names them after your feature, fills in the fields it heard, and auto-links them. When nothing in the palette fits, it synthesizes the closest blocks instead of giving up
  - **Edits what's already there** — "rename it to Payouts", "add a phone field", "remove the amount field", "show 20 rows", "make the queue admin only", "only admins see the table records", "make the KPI sum amounts", "make the button say Send for review". It resolves which block you mean from its name, its type, or the current selection
  - **Explains** — "how do links work?", "where is my form data stored?", "what does the Review Queue do?" get an answer instead of new blocks
- **Edit in place** — rename blocks, reposition them, delete them or their links, or clear the page
- **Save and import tools** — save the board (blocks, links, pages, roles, auth, and backend config) as a named tool; the My Tools section lets you import it back, export it as a `.toolboard.json` file, or import a tool from a file (saved tools persist in localStorage)

## Persisting data

Toolboard runs in the browser and never holds cloud credentials, so the AWS and Azure options
point at an HTTPS endpoint you deploy. The contract is two routes:

- `GET <url>/records` — returns stored records; the runtime hydrates blocks with them on start
- `POST <url>/events` — receives each emitted record plus the `blockId` that produced it

The endpoint must send CORS headers, or the browser blocks the call and the runtime falls back
to in-memory data with an "API unreachable" banner. Ready-to-deploy samples live in
[`examples/`](examples/README.md): a Lambda writing to DynamoDB and an Azure Function writing to
Table Storage.

## Editing blocks

Select any block on the board and the Inspector appears above the Devin chat. Everything the
block shows or emits at runtime comes from that config, including the rows a queue, transaction
feed, chart or connector starts with — add, rename, re-price and re-status them, and the builder
preview and the compiled tool both follow.

## Editing what a form collects

Forms are not fixed. Drop a **Form** (or Payment / Refund) block, select it, and use the
Inspector to add, rename, reorder-by-removal, and re-type fields. At runtime the form renders
exactly those fields, and the emitted record follows them: the first non-numeric field becomes
the record title, the first numeric field becomes the amount (negated for payments), and the
remaining fields are joined into `details` — which downstream tables can show by enabling the
Details column.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — typecheck and build for production
- `npm run lint` — lint with oxlint

## Stack

React 19 + TypeScript + Vite. No other runtime dependencies.
