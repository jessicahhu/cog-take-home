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

export interface Block {
  id: string
  type: BlockType
  label: string
  x: number
  y: number
  building?: boolean
}

export interface PaletteItem {
  type: BlockType
  label: string
  icon: string
  description: string
  section: 'general' | 'fintech'
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
]

const KEYWORDS: Record<BlockType, string[]> = {
  table: ['table', 'grid', 'spreadsheet', 'records', 'rows', 'crud'],
  form: ['form', 'submit', 'intake', 'request', 'survey', 'upload'],
  chart: ['chart', 'graph', 'plot', 'analytics', 'trend', 'visualiz'],
  kpi: ['kpi', 'metric', 'stat', 'count', 'total', 'number'],
  list: ['list', 'feed', 'queue', 'log', 'history', 'activity'],
  button: ['button', 'action', 'trigger', 'run', 'deploy', 'approve'],
  input: ['search', 'filter', 'lookup', 'find', 'query'],
  text: ['text', 'note', 'heading', 'title', 'description', 'label'],
  balance: ['balance', 'account balance', 'wallet', 'funds', 'available'],
  transactions: ['transaction', 'debit', 'credit', 'purchases', 'spending history', 'statement'],
  payment: ['payment', 'pay', 'send money', 'transfer', 'p2p', 'checkout'],
  card: ['card', 'virtual card', 'debit card', 'credit card', 'freeze'],
  linkbank: ['link bank', 'connect bank', 'plaid', 'bank account', 'ach'],
}

export function blocksFromPrompt(prompt: string): BlockType[] {
  const lower = prompt.toLowerCase()
  const matches = (Object.keys(KEYWORDS) as BlockType[]).filter((type) =>
    KEYWORDS[type].some((kw) => lower.includes(kw)),
  )
  if (matches.length > 0) return matches
  return ['table', 'form']
}
