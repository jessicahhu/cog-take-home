# Toolboard

A whiteboard-style interface for building internal tools. Drag feature blocks (tables, forms, charts, KPIs, and more) onto the board, or prompt Devin to create features for you.

## Features

- **Whiteboard canvas** — a dotted-grid board in the center of the screen where feature blocks live
- **Drag and drop** — drag features from the left palette onto the board, then reposition them freely
- **Prompt Devin** — describe what you want in the prompt bar (e.g. "a table of support tickets with a search filter and a chart") and matching feature blocks are created on the board
- **Edit in place** — rename blocks, select them, delete them, or clear the whole board

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
