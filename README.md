# Toolboard

A whiteboard-style interface for building internal tools. Drag feature blocks (tables, forms, charts, KPIs, and more) onto the board, or prompt Devin to create features for you.

## Features

- **Whiteboard canvas** — a dotted-grid board in the center of the screen where feature blocks live
- **Fintech blocks** — a dedicated palette section for consumer fintech apps: balance card, transaction feed, payment form, virtual card, and bank-account linking
- **Internal ops blocks** — building blocks drawn from real internal tools (KYC review queues, refunds dashboards, feature-flag admin panels): customer info, review queue, refund action, feature flags, and audit log
- **Drag and drop** — drag features from the left palette onto the board, then reposition them freely
- **Devin chat** — a chat panel on the right; describe what you want (e.g. "a KYC review queue with customer info and an audit log") and matching feature blocks are created on the board
- **Edit in place** — rename blocks, select them, delete them, or clear the whole board
- **Save and import tools** — save the current board as a named tool ("Save as tool"); the My Tools section in the left panel lets you import it back onto the board, export it as a `.toolboard.json` file, or import a tool from a file (saved tools persist in localStorage)

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
