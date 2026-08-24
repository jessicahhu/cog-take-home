import type { BlockType } from './types'
import { BLOCK_IO, PALETTE } from './types'

interface Topic {
  keywords: string[]
  answer: string
}

/** Conceptual answers about how Toolboard itself works, matched by keyword. */
const TOPICS: Topic[] = [
  {
    keywords: ['link', 'wire', 'connect block', 'data flow', 'port', 'arrow'],
    answer:
      'Links are how data moves. Drag from a block’s right-side output port ◉ onto another block to wire them together. Every block emits or accepts a typed signal — records (rows of data), event (something happened) or query (a filter string) — so a Form can feed a Data Table, but a Search Input can only feed blocks that accept a query. Incompatible links are rejected with a reason, and clicking a wire deletes it.',
  },
  {
    keywords: ['compile', 'run mode', 'runtime', 'preview', 'publish', 'how does the tool run'],
    answer:
      'Compile & Run validates the board and then renders it as a real app. Broken or incompatible links are errors and block the run; blocks with no incoming link are warnings (they show sample data). In run mode the whiteboard look is gone: KPI/balance cards sit on top, tables and feeds fill the main column, and forms and actions go in a sidebar. Exit to builder takes you back.',
  },
  {
    keywords: ['backend', 'persist', 'storage', 'database', 'aws', 'azure', 'lambda', 'dynamo', 'rest', 'where does the data go', 'stored'],
    answer:
      'The Backend selector in the left panel decides where runtime data lives: In-memory (gone when you exit), Browser storage (localStorage, survives reloads on this machine), or an HTTPS endpoint you own — plain REST, AWS (API Gateway + Lambda) or Azure (Functions). For the endpoint options the contract is two routes: GET <url>/records to hydrate blocks on start, and POST <url>/events for every record a block emits (payload includes the blockId). Your endpoint must send CORS headers or the browser blocks the call and the runtime falls back to in-memory with a banner. Deployable samples live in examples/ in the repo — no cloud credentials ever live in the browser.',
  },
  {
    keywords: ['auth', 'sign in', 'login', 'role', 'permission', 'admin', 'viewer', 'ops', 'gate', 'who can see', 'security'],
    answer:
      'Turn on “Require sign-in” in the Access section and the compiled tool opens behind a sign-in screen with demo users (admin/admin, ops/ops, viewer/viewer). Every page and block carries a role badge (All / Ops / Adm) and gating is exact: “All” shows to anyone signed in, while “Ops” shows only to ops and “Adm” only to admins — an ops-only block is hidden from admins too. Separately, “Only admins see submitted records” (on by default) hides record contents in tables, lists, queues, feeds, audit logs, customer info and connectors, so a viewer can submit a form without seeing anyone’s submissions; each of those blocks can override it with “Who sees records” in the Inspector. This is demo-grade, client-side gating — not a substitute for real server-side authorization.',
  },
  {
    keywords: ['inspector', 'configure', 'edit block', 'dynamic', 'customi', 'field', 'column', 'seed row', 'starting row'],
    answer:
      'Select any block and the Inspector opens above this chat — that is where blocks stop being mockups. Forms let you add, rename, re-type and require fields (including select options) and set the submit label; tables choose columns and rows shown; queues, feeds, charts and connector sources have editable starting rows (title, amount, status); KPIs pick count vs sum; and text, buttons, customer info, cards, bank names, flags, Slack channel, email recipient, webhook URL and SQL are all editable. Everything is saved with the tool and drives both the builder preview and the compiled runtime.',
  },
  {
    keywords: ['page', 'sitemap', 'multi-page', 'navigation', 'tab'],
    answer:
      'The Sitemap section in the left panel gives a tool multiple pages. Blocks belong to the page that was active when you dropped them, each page can be renamed and role-gated, and in run mode the pages become navigation tabs (pages gated to another role simply do not appear).',
  },
  {
    keywords: ['connector', 'stripe', 'postgres', 'sheet', 'slack', 'email', 'webhook', 'external', 'integration', 'api'],
    answer:
      'Connectors are the bridge to outside systems. Stripe Payments, Postgres Query and Google Sheet are sources — they emit records into the graph and have sync/query buttons to pull more. Slack Notify, Email Sender and Webhook Out are sinks that surface whatever is linked into them as channel messages, emails, or a real HTTP POST to a URL you type. Apart from Webhook Out they are safe browser-side demos with seeded data — no credentials are involved.',
  },
  {
    keywords: ['save', 'import', 'export', 'my tools', 'json', 'reuse', 'share'],
    answer:
      '“Save as tool” stores the whole board — blocks, their configuration, links, pages, roles, auth and backend settings — in the My Tools section (kept in localStorage). From there you can import it back onto the board, export it as a .toolboard.json file, or import a file someone sent you. Older exports still import: anything missing falls back to that block type’s defaults.',
  },
  {
    keywords: ['what is toolboard', 'what can you do', 'how does this work', 'get started', 'help', 'overview', 'what is this'],
    answer:
      'Toolboard turns a whiteboard into a working internal tool. Drag blocks from the left palette onto the canvas (or describe what you need here and I will add them), wire them together so data flows, configure each one in the Inspector, pick where data is stored with the Backend selector, optionally require sign-in and role-gate pages and blocks, then hit Compile & Run to get a clean app. Save the result as a tool you can re-import later. Ask me how any of those pieces work, or just tell me what to build.',
  },
  {
    keywords: ['difference between', 'vs ', 'when should i use'],
    answer:
      'Rough guide: a Data Table shows full records and a List is a lighter feed of titles; a KPI Card is one headline number (count or sum) and a Chart is the shape of those amounts over the recent records; a Form collects anything you define, while Payment and Refund are forms pre-shaped for money movement (payments emit negative amounts so a Balance Card goes down). Review Queue is the only block that lets someone approve or reject records, and the Audit Log is where those decisions land.',
  },
]

const QUESTION_STARTS = [
  'what',
  'how',
  'why',
  'when',
  'where',
  'which',
  'who',
  'can ',
  'could ',
  'should ',
  'do ',
  'does ',
  'is ',
  'are ',
  'explain',
  'tell me',
  'help',
]

const BUILD_VERBS = ['add ', 'build ', 'create ', 'make me', 'give me', 'i need', 'i want', 'set up ', 'drop in ']
const EXPLAIN_STARTS = ['what', 'how', 'why', 'when', 'where', 'which', 'who', 'explain', 'tell me']

/** "can you add a refund form?" is a build request; "how do links work?" is a question. */
function isQuestion(lower: string): boolean {
  const asked = lower.includes('?') || QUESTION_STARTS.some((q) => lower.startsWith(q))
  if (!asked) return false
  const explaining = EXPLAIN_STARTS.some((q) => lower.startsWith(q))
  return explaining || !BUILD_VERBS.some((v) => lower.includes(v))
}

const SIGNAL_WORDS: Record<string, string> = {
  records: 'rows of data',
  event: 'an event',
  query: 'a filter string',
}

function describeBlock(lower: string): string | null {
  const item = PALETTE.find((p) => lower.includes(p.label.toLowerCase()))
  if (!item) return null
  const io = BLOCK_IO[item.type as BlockType]
  const emits = io.emits ? `emits ${SIGNAL_WORDS[io.emits]}` : 'emits nothing'
  const accepts =
    io.accepts.length > 0
      ? `accepts ${io.accepts.map((a) => SIGNAL_WORDS[a]).join(' or ')}`
      : 'takes no input'
  return `${item.label} — ${item.description.toLowerCase()}. It ${accepts} and ${emits}, so link it accordingly. Select it on the board to configure it in the Inspector.`
}

/**
 * Answer a conceptual question about the builder. Returns null when the prompt
 * reads like a build request, so the caller falls back to creating blocks.
 */
export function answerQuestion(prompt: string): string | null {
  const lower = prompt.trim().toLowerCase()
  if (!isQuestion(lower)) return null

  const blockAnswer = describeBlock(lower)
  const scored = TOPICS.map((t) => ({
    topic: t,
    score: t.keywords.filter((k) => lower.includes(k)).length,
  })).sort((a, b) => b.score - a.score)

  const best = scored[0]
  if (best && best.score > 0) return best.topic.answer
  if (blockAnswer) return blockAnswer
  return 'I can explain how any part of Toolboard works — blocks and what they do, links and typed data flow, the Inspector, pages, backends and persistence, connectors, auth and role gating, saving and importing tools, or what Compile & Run checks. Ask about one of those, or describe a feature and I will build it on the board.'
}
