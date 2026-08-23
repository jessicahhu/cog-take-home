export type BlockType =
  | 'table'
  | 'form'
  | 'chart'
  | 'kpi'
  | 'list'
  | 'button'
  | 'input'
  | 'text'
  | 'balance'
  | 'transactions'
  | 'payment'
  | 'card'
  | 'linkbank'
  | 'customer'
  | 'queue'
  | 'refund'
  | 'flags'
  | 'audit'

export interface Block {
  id: string
  type: BlockType
  label: string
  x: number
  y: number
  pageId: string
  building?: boolean
}

export interface Link {
  id: string
  from: string
  to: string
}

export interface Page {
  id: string
  name: string
}

export type BackendKind = 'memory' | 'browser' | 'rest'

export interface BackendConfig {
  kind: BackendKind
  restUrl: string
}

export const BACKEND_LABELS: Record<BackendKind, string> = {
  memory: 'In-memory (resets on exit)',
  browser: 'Browser storage (persists)',
  rest: 'REST API (bring your own)',
}

/** What each block emits downstream and accepts from upstream links. */
export type SignalKind = 'records' | 'event' | 'query'

export const BLOCK_IO: Record<BlockType, { emits: SignalKind | null; accepts: SignalKind[] }> = {
  table: { emits: 'records', accepts: ['records', 'query'] },
  form: { emits: 'records', accepts: [] },
  chart: { emits: null, accepts: ['records'] },
  kpi: { emits: null, accepts: ['records'] },
  list: { emits: 'records', accepts: ['records', 'query'] },
  button: { emits: 'event', accepts: [] },
  input: { emits: 'query', accepts: [] },
  text: { emits: null, accepts: [] },
  balance: { emits: null, accepts: ['records', 'event'] },
  transactions: { emits: 'records', accepts: ['records', 'event'] },
  payment: { emits: 'records', accepts: [] },
  card: { emits: 'event', accepts: [] },
  linkbank: { emits: 'event', accepts: [] },
  customer: { emits: null, accepts: ['records'] },
  queue: { emits: 'records', accepts: ['records'] },
  refund: { emits: 'records', accepts: [] },
  flags: { emits: 'event', accepts: [] },
  audit: { emits: null, accepts: ['records', 'event'] },
}

export function canLink(from: BlockType, to: BlockType): boolean {
  const emits = BLOCK_IO[from].emits
  return emits !== null && BLOCK_IO[to].accepts.includes(emits)
}

export interface PaletteItem {
  type: BlockType
  label: string
  icon: string
  description: string
  section: 'general' | 'fintech' | 'ops'
}

export const SECTION_TITLES: Record<PaletteItem['section'], string> = {
  general: 'Features',
  fintech: 'Fintech',
  ops: 'Internal Ops',
}

export const PALETTE: PaletteItem[] = [
  { type: 'table', label: 'Data Table', icon: '▦', description: 'Sortable rows of records', section: 'general' },
  { type: 'form', label: 'Form', icon: '✎', description: 'Collect structured input', section: 'general' },
  { type: 'chart', label: 'Chart', icon: '◔', description: 'Visualize metrics', section: 'general' },
  { type: 'kpi', label: 'KPI Card', icon: '⬢', description: 'Single headline number', section: 'general' },
  { type: 'list', label: 'List', icon: '☰', description: 'Scrollable item feed', section: 'general' },
  { type: 'button', label: 'Action Button', icon: '▶', description: 'Trigger a workflow', section: 'general' },
  { type: 'input', label: 'Search Input', icon: '⌕', description: 'Filter or look up data', section: 'general' },
  { type: 'text', label: 'Text Block', icon: '¶', description: 'Notes and headings', section: 'general' },
  { type: 'balance', label: 'Balance Card', icon: '$', description: 'Account balance at a glance', section: 'fintech' },
  { type: 'transactions', label: 'Transaction Feed', icon: '⇅', description: 'Recent debits and credits', section: 'fintech' },
  { type: 'payment', label: 'Payment Form', icon: '➤', description: 'Send money to a recipient', section: 'fintech' },
  { type: 'card', label: 'Virtual Card', icon: '▭', description: 'Card number, expiry, and freeze', section: 'fintech' },
  { type: 'linkbank', label: 'Link Bank Account', icon: '⛓', description: 'Plaid-style account connect', section: 'fintech' },
  { type: 'customer', label: 'Customer Info', icon: '☺', description: 'Identity, contact, and KYC status', section: 'ops' },
  { type: 'queue', label: 'Review Queue', icon: '☷', description: 'Cases with approve / reject actions', section: 'ops' },
  { type: 'refund', label: 'Refund Action', icon: '↺', description: 'Issue a refund with reason', section: 'ops' },
  { type: 'flags', label: 'Feature Flags', icon: '⎇', description: 'Toggle flags per environment', section: 'ops' },
  { type: 'audit', label: 'Audit Log', icon: '≣', description: 'Who did what, and when', section: 'ops' },
]

const KEYWORDS: Record<BlockType, string[]> = {
  table: ['table', 'grid', 'spreadsheet', 'records', 'rows', 'crud'],
  form: ['form', 'submit', 'intake', 'request', 'survey', 'upload'],
  chart: ['chart', 'graph', 'plot', 'analytics', 'trend', 'visualiz'],
  kpi: ['kpi', 'metric', 'stat', 'count', 'total', 'number'],
  list: ['list', 'feed', 'history', 'activity'],
  button: ['button', 'action', 'trigger', 'run', 'deploy', 'approve'],
  input: ['search', 'filter', 'lookup', 'find', 'query'],
  text: ['text', 'note', 'heading', 'title', 'description', 'label'],
  balance: ['balance', 'account balance', 'wallet', 'funds', 'available'],
  transactions: ['transaction', 'debit', 'credit', 'purchases', 'spending history', 'statement'],
  payment: ['payment', 'pay', 'send money', 'transfer', 'p2p', 'checkout'],
  card: ['card', 'virtual card', 'debit card', 'credit card', 'freeze'],
  linkbank: ['link bank', 'connect bank', 'plaid', 'bank account', 'ach'],
  customer: ['customer', 'user info', 'profile', 'identity', 'kyc', 'contact'],
  queue: ['queue', 'review', 'case', 'moderation', 'escalation', 'triage'],
  refund: ['refund', 'chargeback', 'reimburse', 'dispute'],
  flags: ['flag', 'feature flag', 'toggle', 'rollout', 'experiment', 'kill switch'],
  audit: ['audit', 'compliance', 'trail', 'who did'],
}

export interface SavedToolBlock {
  type: BlockType
  label: string
  x: number
  y: number
  /** Index into the saved pages array. Absent in v1 exports (single page). */
  page?: number
}

export interface SavedToolLink {
  /** Indexes into the saved blocks array. */
  from: number
  to: number
}

export interface SavedTool {
  id: string
  name: string
  savedAt: string
  blocks: SavedToolBlock[]
  pages?: string[]
  links?: SavedToolLink[]
  backend?: BackendConfig
}

const STORAGE_KEY = 'toolboard-saved-tools'
const VALID_TYPES = new Set<string>(PALETTE.map((p) => p.type))
const BACKEND_KINDS = new Set<string>(['memory', 'browser', 'rest'])

function isSavedTool(value: unknown): value is SavedTool {
  if (typeof value !== 'object' || value === null) return false
  const tool = value as Record<string, unknown>
  if (
    typeof tool.id !== 'string' ||
    typeof tool.name !== 'string' ||
    typeof tool.savedAt !== 'string' ||
    !Array.isArray(tool.blocks)
  ) {
    return false
  }
  const blocksOk = tool.blocks.every((b: unknown) => {
    if (typeof b !== 'object' || b === null) return false
    const block = b as Record<string, unknown>
    return (
      typeof block.type === 'string' &&
      VALID_TYPES.has(block.type) &&
      typeof block.label === 'string' &&
      typeof block.x === 'number' &&
      typeof block.y === 'number' &&
      (block.page === undefined || typeof block.page === 'number')
    )
  })
  if (!blocksOk) return false
  if (tool.pages !== undefined && !(Array.isArray(tool.pages) && tool.pages.every((p) => typeof p === 'string'))) {
    return false
  }
  if (tool.links !== undefined) {
    if (!Array.isArray(tool.links)) return false
    const count = tool.blocks.length
    const linksOk = tool.links.every((l: unknown) => {
      if (typeof l !== 'object' || l === null) return false
      const link = l as Record<string, unknown>
      return (
        typeof link.from === 'number' &&
        typeof link.to === 'number' &&
        link.from >= 0 &&
        link.from < count &&
        link.to >= 0 &&
        link.to < count
      )
    })
    if (!linksOk) return false
  }
  if (tool.backend !== undefined) {
    const backend = tool.backend as Record<string, unknown>
    if (
      typeof backend !== 'object' ||
      backend === null ||
      typeof backend.kind !== 'string' ||
      !BACKEND_KINDS.has(backend.kind) ||
      typeof backend.restUrl !== 'string'
    ) {
      return false
    }
  }
  return true
}

export function loadSavedTools(): SavedTool[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isSavedTool) : []
  } catch {
    return []
  }
}

export function persistSavedTools(tools: SavedTool[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tools))
}

export function parseSavedTool(json: string): SavedTool | null {
  try {
    const parsed: unknown = JSON.parse(json)
    return isSavedTool(parsed) ? parsed : null
  } catch {
    return null
  }
}

export interface CompileResult {
  ok: boolean
  errors: string[]
  warnings: string[]
}

/** Validate the block graph before running the tool. */
export function compileTool(blocks: Block[], links: Link[], pages: Page[]): CompileResult {
  const errors: string[] = []
  const warnings: string[] = []
  if (blocks.length === 0) {
    errors.push('The board is empty — add at least one block before running.')
  }
  const byId = new Map(blocks.map((b) => [b.id, b]))
  const incoming = new Set(links.map((l) => l.to))
  for (const link of links) {
    const from = byId.get(link.from)
    const to = byId.get(link.to)
    if (!from || !to) {
      errors.push('A link points at a deleted block.')
      continue
    }
    if (!canLink(from.type, to.type)) {
      errors.push(`"${from.label}" cannot feed "${to.label}" — incompatible signal.`)
    }
  }
  for (const block of blocks) {
    const io = BLOCK_IO[block.type]
    if (io.accepts.length > 0 && io.emits === null && !incoming.has(block.id)) {
      warnings.push(`"${block.label}" has no incoming link — it will show sample data only.`)
    }
  }
  for (const page of pages) {
    if (!blocks.some((b) => b.pageId === page.id)) {
      warnings.push(`Page "${page.name}" is empty.`)
    }
  }
  return { ok: errors.length === 0, errors, warnings }
}

export function blocksFromPrompt(prompt: string): BlockType[] {
  const lower = prompt.toLowerCase()
  const matches = (Object.keys(KEYWORDS) as BlockType[]).filter((type) =>
    KEYWORDS[type].some((kw) => lower.includes(kw)),
  )
  if (matches.length > 0) return matches
  return ['table', 'form']
}
