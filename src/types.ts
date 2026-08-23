export type BlockType =
  | 'table'
  | 'form'
  | 'chart'
  | 'kpi'
  | 'list'
  | 'button'
  | 'input'
  | 'text'

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
}

export const PALETTE: PaletteItem[] = [
  { type: 'table', label: 'Data Table', icon: '▦', description: 'Sortable rows of records' },
  { type: 'form', label: 'Form', icon: '✎', description: 'Collect structured input' },
  { type: 'chart', label: 'Chart', icon: '◔', description: 'Visualize metrics' },
  { type: 'kpi', label: 'KPI Card', icon: '⬢', description: 'Single headline number' },
  { type: 'list', label: 'List', icon: '☰', description: 'Scrollable item feed' },
  { type: 'button', label: 'Action Button', icon: '▶', description: 'Trigger a workflow' },
  { type: 'input', label: 'Search Input', icon: '⌕', description: 'Filter or look up data' },
  { type: 'text', label: 'Text Block', icon: '¶', description: 'Notes and headings' },
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
}

export function blocksFromPrompt(prompt: string): BlockType[] {
  const lower = prompt.toLowerCase()
  const matches = (Object.keys(KEYWORDS) as BlockType[]).filter((type) =>
    KEYWORDS[type].some((kw) => lower.includes(kw)),
  )
  if (matches.length > 0) return matches
  return ['table', 'form']
}
