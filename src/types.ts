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
  | 'stripe'
  | 'postgres'
  | 'sheets'
  | 'slack'
  | 'email'
  | 'webhook'

/** Role that may see a page or block at runtime. */
export type Role = 'everyone' | 'ops' | 'admin'

/** How a gate reads on a page or block badge. */
export const ROLE_LABELS: Record<Role, string> = {
  everyone: 'Everyone',
  ops: 'Ops only',
  admin: 'Admin only',
}

/** How a signed-in user's own role reads. */
export const USER_ROLE_LABELS: Record<Role, string> = {
  everyone: 'Viewer',
  ops: 'Ops',
  admin: 'Admin',
}

/**
 * Gating is exact, not hierarchical: `everyone` is visible to every signed-in
 * user, while `ops` and `admin` are visible only to that role.
 */
export function canSeeRole(required: Role | undefined, userRole: Role): boolean {
  const role = required ?? 'everyone'
  return role === 'everyone' || role === userRole
}

export interface DemoUser {
  username: string
  password: string
  role: Role
}

/** Demo directory used by the runtime sign-in screen when auth is enabled. */
export const DEMO_USERS: DemoUser[] = [
  { username: 'admin', password: 'admin', role: 'admin' },
  { username: 'ops', password: 'ops', role: 'ops' },
  { username: 'viewer', password: 'viewer', role: 'everyone' },
]

export interface AuthConfig {
  required: boolean
  /** Show submitted records to admins only (blocks can override with `dataRole`). */
  adminOnlyData?: boolean
}

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'textarea'

export interface FormField {
  id: string
  label: string
  type: FieldType
  required: boolean
  /** Choices for `select` fields. */
  options?: string[]
}

export type ColumnKey = 'title' | 'details' | 'amount' | 'status' | 'source' | 'when'

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  title: 'Title',
  details: 'Details',
  amount: 'Amount',
  status: 'Status',
  source: 'Source',
  when: 'When',
}

export const ALL_COLUMNS: ColumnKey[] = ['title', 'details', 'amount', 'status', 'source', 'when']

/** A pre-populated record for blocks that start with data (queues, feeds, connectors). */
export interface SeedRow {
  id: string
  title: string
  amount?: number
  status?: 'pending' | 'approved' | 'rejected'
}

/** Per-block settings edited in the builder's Inspector. Everything is optional; defaults come from `defaultConfig`. */
export interface BlockConfig {
  /** form / payment / refund */
  fields?: FormField[]
  submitLabel?: string
  /** table / list / queue / transactions / audit / connectors */
  columns?: ColumnKey[]
  rowLimit?: number
  /** text block */
  text?: string
  /** kpi */
  metricLabel?: string
  metricMode?: 'count' | 'sum'
  metricUnit?: string
  /** balance */
  startingBalance?: number
  /** input */
  placeholder?: string
  /** role that sees the records this block displays */
  dataRole?: Role
  /** starting rows for queues, feeds, tables and connector sources */
  seedRows?: SeedRow[]
  /** button: title of the record it emits */
  emitTitle?: string
  /** customer info */
  customerName?: string
  customerEmail?: string
  kycStatus?: 'pending' | 'approved' | 'rejected'
  /** virtual card */
  cardNumber?: string
  cardExpiry?: string
  /** link bank account */
  bankName?: string
  /** feature flags */
  flags?: string[]
  /** connectors */
  channel?: string
  emailTo?: string
  webhookUrl?: string
  sql?: string
}

let fieldSeq = 0
export const newFieldId = () => `field-${Date.now().toString(36)}-${fieldSeq++}`

const row = (title: string, amount?: number, status?: SeedRow['status']): SeedRow => ({
  id: newFieldId(),
  title,
  ...(amount === undefined ? {} : { amount }),
  ...(status === undefined ? {} : { status }),
})

const field = (label: string, type: FieldType, required = false, options?: string[]): FormField => ({
  id: newFieldId(),
  label,
  type,
  required,
  ...(options ? { options } : {}),
})

/** Starting configuration for a freshly dropped block — every value is editable in the Inspector. */
export function defaultConfig(type: BlockType): BlockConfig {
  switch (type) {
    case 'form':
      return {
        fields: [field('Title', 'text', true), field('Amount', 'number')],
        submitLabel: 'Submit',
      }
    case 'payment':
      return {
        fields: [field('Recipient', 'text', true), field('Amount', 'number', true)],
        submitLabel: 'Send',
      }
    case 'refund':
      return {
        fields: [
          field('Amount', 'number', true),
          field('Reason', 'select', true, ['duplicate charge', 'not received', 'fraud', 'other']),
        ],
        submitLabel: 'Issue refund',
      }
    case 'table':
      return { columns: ['title', 'amount', 'when'], rowLimit: 6, seedRows: [] }
    case 'list':
    case 'audit':
      return { rowLimit: 6, seedRows: [] }
    case 'chart':
      return { rowLimit: 8, seedRows: [row('Mon', 40), row('Tue', 70), row('Wed', 55), row('Thu', 90)] }
    case 'queue':
      return {
        rowLimit: 6,
        seedRows: [
          row('Case #4821 — ID document review', undefined, 'pending'),
          row('Case #4822 — address mismatch', undefined, 'pending'),
        ],
      }
    case 'transactions':
      return {
        rowLimit: 6,
        seedRows: [
          row('Whole Foods', -84.12),
          row('Rent — August', -1850),
          row('Payroll', 2150),
          row('Blue Bottle', -6.4),
          row('Lyft', -18.25),
        ],
      }
    case 'stripe':
      return {
        rowLimit: 6,
        seedRows: [
          row('ch_3OkT2b — Acme Inc (Pro plan)', 149),
          row('ch_3OkT9x — Globex (Starter)', 29),
          row('ch_3OkUc4 — Initech (Pro plan)', 149),
          row('Payout → bank •••6841', -1320),
        ],
      }
    case 'sheets':
      return {
        rowLimit: 6,
        seedRows: [
          row('Invoice — Staples office supplies', -212.4),
          row('Invoice — AWS July', -1840.22),
          row('Invoice — Figma seats', -144),
        ],
      }
    case 'postgres':
      return {
        rowLimit: 6,
        sql: 'SELECT * FROM signups ORDER BY created_at DESC;',
        seedRows: [
          row('jane@acme.com — signup (verified)', undefined, 'approved'),
          row('omar@globex.io — signup (pending)', undefined, 'pending'),
          row('lin@initech.dev — signup (verified)', undefined, 'approved'),
          row('sam@umbrella.co — signup (rejected)', undefined, 'rejected'),
        ],
      }
    case 'text':
      return { text: 'Double-click to edit this note.' }
    case 'kpi':
      return { metricLabel: '', metricMode: 'count', metricUnit: 'records' }
    case 'balance':
      return { startingBalance: 2500 }
    case 'input':
      return { placeholder: '⌕ Filter linked blocks…' }
    case 'button':
      return { submitLabel: 'Run', emitTitle: '' }
    case 'customer':
      return { customerName: 'Jane Doe', customerEmail: 'jane@acme.com', kycStatus: 'pending' }
    case 'card':
      return { cardNumber: '•••• 4242', cardExpiry: '09/29' }
    case 'linkbank':
      return { bankName: 'Chase •••6841' }
    case 'flags':
      return { flags: ['new-onboarding', 'instant-transfers'] }
    case 'slack':
      return { channel: '#ops-alerts', rowLimit: 5 }
    case 'email':
      return { emailTo: 'ops@company.com', rowLimit: 5 }
    case 'webhook':
      return { webhookUrl: '', rowLimit: 4 }
    default:
      return {}
  }
}

export interface Block {
  id: string
  type: BlockType
  label: string
  x: number
  y: number
  pageId: string
  role?: Role
  config?: BlockConfig
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
  role?: Role
}

export type BackendKind = 'memory' | 'browser' | 'rest' | 'aws' | 'azure'

export interface BackendConfig {
  kind: BackendKind
  restUrl: string
}

export const BACKEND_LABELS: Record<BackendKind, string> = {
  memory: 'In-memory (resets on exit)',
  browser: 'Browser storage (persists)',
  rest: 'REST API (bring your own)',
  aws: 'AWS — API Gateway + Lambda',
  azure: 'Azure — Functions',
}

export const BACKEND_HINTS: Record<BackendKind, string> = {
  memory: 'Data lives in memory while the tool runs.',
  browser: 'Data persists in this browser between runs.',
  rest: 'Records load from GET /records and every submission POSTs to /events.',
  aws: 'Point at your API Gateway stage URL (Lambda + DynamoDB). See examples/aws-lambda in the repo.',
  azure: 'Point at your Function App URL (Functions + Table/Cosmos). See examples/azure-function in the repo.',
}

/** Backends that persist through an HTTP endpoint using the documented /records + /events contract. */
export const HTTP_BACKENDS: BackendKind[] = ['rest', 'aws', 'azure']

export const isHttpBackend = (kind: BackendKind) => HTTP_BACKENDS.includes(kind)

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
  stripe: { emits: 'records', accepts: [] },
  postgres: { emits: 'records', accepts: ['query'] },
  sheets: { emits: 'records', accepts: [] },
  slack: { emits: null, accepts: ['records', 'event'] },
  email: { emits: null, accepts: ['records', 'event'] },
  webhook: { emits: null, accepts: ['records', 'event'] },
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
  section: 'general' | 'fintech' | 'ops' | 'connectors'
}

export const SECTION_TITLES: Record<PaletteItem['section'], string> = {
  general: 'Features',
  fintech: 'Fintech',
  ops: 'Internal Ops',
  connectors: 'Connectors',
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
  { type: 'stripe', label: 'Stripe Payments', icon: '⚡', description: 'Charges and payouts from Stripe', section: 'connectors' },
  { type: 'postgres', label: 'Postgres Query', icon: '⛁', description: 'Rows from a SQL database', section: 'connectors' },
  { type: 'sheets', label: 'Google Sheet', icon: '▤', description: 'Rows synced from a spreadsheet', section: 'connectors' },
  { type: 'slack', label: 'Slack Notify', icon: '⌗', description: 'Post linked activity to a channel', section: 'connectors' },
  { type: 'email', label: 'Email Sender', icon: '✉', description: 'Send email for linked activity', section: 'connectors' },
  { type: 'webhook', label: 'Webhook Out', icon: '↯', description: 'POST linked activity to any URL', section: 'connectors' },
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
  stripe: ['stripe', 'charges', 'payout'],
  postgres: ['postgres', 'sql', 'database', 'db query'],
  sheets: ['sheet', 'spreadsheet', 'google sheet', 'csv'],
  slack: ['slack', 'notify', 'notification', 'channel'],
  email: ['email', 'mail', 'send email'],
  webhook: ['webhook', 'callback', 'post to url'],
}

export interface SavedToolBlock {
  type: BlockType
  label: string
  x: number
  y: number
  /** Index into the saved pages array. Absent in v1 exports (single page). */
  page?: number
  role?: Role
  config?: BlockConfig
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
  /** Parallel to `pages`: role per page. Absent in older exports. */
  pageRoles?: Role[]
  auth?: AuthConfig
}

const STORAGE_KEY = 'toolboard-saved-tools'
const VALID_TYPES = new Set<string>(PALETTE.map((p) => p.type))
const BACKEND_KINDS = new Set<string>(['memory', 'browser', 'rest', 'aws', 'azure'])
const ROLES = new Set<string>(['everyone', 'ops', 'admin'])

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
      (block.page === undefined || typeof block.page === 'number') &&
      (block.role === undefined || (typeof block.role === 'string' && ROLES.has(block.role))) &&
      (block.config === undefined || (typeof block.config === 'object' && block.config !== null))
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
  if (
    tool.pageRoles !== undefined &&
    !(Array.isArray(tool.pageRoles) && tool.pageRoles.every((r) => typeof r === 'string' && ROLES.has(r)))
  ) {
    return false
  }
  if (tool.auth !== undefined) {
    const auth = tool.auth as Record<string, unknown>
    if (typeof auth !== 'object' || auth === null || typeof auth.required !== 'boolean') return false
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

/** Keywords match at a word boundary, so "refunds" doesn't match "funds". */
const hasKeyword = (lower: string, kw: string) =>
  new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(lower)

/** Block types whose keywords appear in a prompt — empty when nothing matches. */
export function matchBlockTypes(prompt: string): BlockType[] {
  const lower = prompt.toLowerCase()
  return (Object.keys(KEYWORDS) as BlockType[]).filter((type) =>
    KEYWORDS[type].some((kw) => hasKeyword(lower, kw)),
  )
}

export function blocksFromPrompt(prompt: string): BlockType[] {
  const matches = matchBlockTypes(prompt)
  if (matches.length > 0) return matches
  return ['table', 'form']
}
