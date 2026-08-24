# Toolboard

A whiteboard-style builder for internal tools. Drag executable feature blocks onto the board, wire them together so data flows between them, then **Compile & Run** to use the tool you built.

## Features

- **Executable blocks** — every block is a working component at runtime: forms submit real records, tables/lists/charts/KPIs render live data, queues approve/reject cases, refunds and payments move money, feature flags toggle, and the audit log records everything
- **Links (data flow)** — drag from a block's right-side output port ◉ to another block to wire them together (e.g. Form → Data Table, Payment → Balance, Review Queue → Audit Log); incompatible links are rejected with an explanation
- **Compile & Run** — validates the block graph (broken or incompatible links are errors, unlinked sinks are warnings) and launches the tool in a runtime view where every block is live
- **Sitemap** — structure a tool into multiple pages from the left panel; the runtime shows them as navigation tabs
- **Backend selector** — choose where runtime data lives: in-memory, browser storage (persists between runs), or a REST API you provide (events are POSTed; falls back to in-memory when unreachable)
- **Fintech blocks** — balance card, transaction feed, payment form, virtual card, and bank-account linking
- **Internal ops blocks** — building blocks drawn from real internal tools (KYC review queues, refunds dashboards, feature-flag admin panels): customer info, review queue, refund action, feature flags, and audit log
- **Devin chat** — describe what you want (e.g. "a KYC review queue with customer info and an audit log") and matching blocks are created and auto-linked on the board
- **Edit in place** — rename blocks, reposition them, delete them or their links, or clear the page
- **Save and import tools** — save the board (blocks, links, pages, and backend config) as a named tool; the My Tools section lets you import it back, export it as a `.toolboard.json` file, or import a tool from a file (saved tools persist in localStorage)

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
