import type {
  Block,
  BlockConfig,
  BlockType,
  ColumnKey,
  FieldType,
  FormField,
  Role,
} from './types'
import { ALL_COLUMNS, COLUMN_LABELS, PALETTE, defaultConfig, matchBlockTypes, newFieldId } from './types'

export interface AgentContext {
  blocks: Block[]
  activePageId: string
  selectedId: string | null
}

/** A change to one existing block. `config` is the full replacement config. */
export interface BlockPatch {
  blockId: string
  label?: string
  role?: Role
  config?: BlockConfig
  remove?: boolean
}

export interface NewBlockSpec {
  type: BlockType
  label: string
  config: BlockConfig
}

export type AgentPlan =
  | { kind: 'edit'; patch: BlockPatch; summary: string }
  | { kind: 'create'; specs: NewBlockSpec[]; note: string | null }
  /** Understood which block was meant, but not what to change. */
  | { kind: 'clarify'; blockId: string; text: string }

const LABEL_OF: Record<BlockType, string> = PALETTE.reduce(
  (acc, item) => ({ ...acc, [item.type]: item.label }),
  {} as Record<BlockType, string>,
)

/* ---------------- shared parsing helpers ---------------- */

const STOP_WORDS = ['a', 'an', 'the', 'their', 'its', 'and', 'with', 'of', 'for']
/** Words that follow a "field"/"column" cue but are instructions, not names. */
const NOISE = ['required', 'optional', 'visible', 'hidden', 'admin', 'admin only', 'ops', 'everyone', 'blank', 'empty']

const titleCase = (s: string) =>
  s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')

/** Split "name, email and amount" into ["name", "email", "amount"]. */
function splitList(raw: string): string[] {
  return raw
    .replace(/\.$/, '')
    .split(/,| and | & |\band\b/)
    .map((s) => s.trim().replace(/^(a|an|the) /, '').replace(/["'“”]/g, ''))
    .filter((s) => s.length > 0 && s.length < 40 && !STOP_WORDS.includes(s))
}

const LIST_CUE =
  /\b(?:with|fields?|columns?|collect(?:ing|s)?|captur(?:ing|es?)|asks? for|including|include)\b\s*(?:for|called|named|are|to|of)?\s*:?\s+(.+)$/i

/** Grab the list of things a prompt says a block should hold: "with x, y and z". */
function listAfterCue(text: string): string[] {
  const cue = text.match(LIST_CUE)
  if (!cue) return []
  const rest = cue[1].trim()
  if (/^(from|in|on|off|the |that |which )/i.test(rest)) return []
  return splitList(rest).filter((s) => !NOISE.includes(s.toLowerCase()))
}

/** The part of a prompt that names the feature, before any list of fields. */
const headOf = (text: string) => text.split(LIST_CUE)[0] || text

const NUMBER_WORDS = ['amount', 'total', 'price', 'cost', 'qty', 'quantity', 'count', 'balance', 'fee', 'score']
const DATE_WORDS = ['date', 'when', 'deadline', 'dob', 'birthday', 'expiry', 'created']
const LONG_WORDS = ['note', 'notes', 'description', 'comment', 'comments', 'reason', 'details', 'message']
const CHOICE_WORDS: Record<string, string[]> = {
  status: ['pending', 'approved', 'rejected'],
  priority: ['low', 'medium', 'high'],
  reason: ['duplicate charge', 'not received', 'fraud', 'other'],
  type: ['standard', 'expedited', 'other'],
}

function fieldTypeFor(label: string): { type: FieldType; options?: string[] } {
  const l = label.toLowerCase()
  const choice = Object.keys(CHOICE_WORDS).find((k) => l === k || l.endsWith(` ${k}`))
  if (choice) return { type: 'select', options: CHOICE_WORDS[choice] }
  if (NUMBER_WORDS.some((w) => l.includes(w))) return { type: 'number' }
  if (DATE_WORDS.some((w) => l.includes(w))) return { type: 'date' }
  if (LONG_WORDS.some((w) => l.includes(w))) return { type: 'textarea' }
  return { type: 'text' }
}

function toField(label: string): FormField {
  const { type, options } = fieldTypeFor(label)
  return {
    id: newFieldId(),
    label: titleCase(label),
    type,
    required: /^(name|email|amount|title)/i.test(label),
    ...(options ? { options } : {}),
  }
}

function toColumns(names: string[]): ColumnKey[] {
  const cols = names
    .map((n) => {
      const l = n.toLowerCase()
      return ALL_COLUMNS.find((c) => l.includes(c) || l.includes(COLUMN_LABELS[c].toLowerCase())) ?? null
    })
    .filter((c): c is ColumnKey => c !== null)
  return [...new Set(cols)]
}

const roleFromText = (lower: string): Role | null => {
  if (/\b(admin[- ]only|only admins?|admins? only|restrict\w* (?:it |them )?to admin|admins? can)\b/.test(lower))
    return 'admin'
  if (/\b(ops[- ]only|only ops|ops\+|ops and admin|restrict\w* (?:it |them )?to ops)\b/.test(lower)) return 'ops'
  if (/\b(everyone|anyone|all users|ungate|un-gate)\b/.test(lower)) return 'everyone'
  return null
}

/* ---------------- editing existing blocks ---------------- */

const EDIT_CUES =
  /\b(rename|call it|change|edit|update|set|make|remove|delete|drop|hide|restrict|limit|require|clear)\b|\badd\b[^.]*\b(field|column|option|row)\b|\b(only admins?|admins? only|admin[- ]only|only ops|ops only)\b|\bshow \d+ rows?\b/

/** Find the block a prompt is talking about: by name, by type, or the selected one. */
function resolveTarget(lower: string, ctx: AgentContext): Block | null {
  const onPage = ctx.blocks.filter((b) => b.pageId === ctx.activePageId)
  const pool = onPage.length > 0 ? onPage : ctx.blocks
  const byLabel = [...pool]
    .sort((a, b) => b.label.length - a.label.length)
    .find((b) => b.label.length > 2 && lower.includes(b.label.toLowerCase()))
  if (byLabel) return byLabel

  const selected = ctx.blocks.find((b) => b.id === ctx.selectedId) ?? null
  for (const type of matchBlockTypes(lower)) {
    if (selected?.type === type) return selected
    const ofType = pool.filter((b) => b.type === type)
    if (ofType.length > 0) return ofType[0]
  }
  if (selected) return selected

  // "make the amount field required" — fall back to whichever block owns that field.
  const byField = pool.find((b) =>
    (b.config?.fields ?? []).some((f) => lower.includes(f.label.toLowerCase())),
  )
  return byField ?? (pool.length === 1 ? pool[0] : null)
}

interface EditResult {
  config: BlockConfig
  label?: string
  role?: Role
  remove?: boolean
  notes: string[]
}

// eslint-disable-next-line complexity -- one branch per supported edit phrase
function applyEdits(text: string, lower: string, block: Block): EditResult | null {
  const config: BlockConfig = { ...defaultConfig(block.type), ...(block.config ?? {}) }
  const notes: string[] = []
  const out: EditResult = { config, notes }

  if (/\b(delete|remove|get rid of)\b/.test(lower) && !/\b(field|column|row|option)\b/.test(lower)) {
    return { ...out, remove: true, notes: [`deleted ${block.label}`] }
  }

  const rename = text.match(/\b(?:rename|call|name)\b.*?\b(?:to|as)\s+["“']?([^"”'.!?]+)["”']?/i)
  if (rename) {
    out.label = rename[1].trim()
    notes.push(`renamed it “${out.label}”`)
  }

  const role = roleFromText(lower)
  if (role) {
    if (/\b(record|records|submission|submissions|data|rows)\b/.test(lower)) {
      config.dataRole = role
      notes.push(`limited its records to ${role === 'everyone' ? 'everyone signed in' : role}`)
    } else {
      out.role = role
      notes.push(`set access to ${role === 'everyone' ? 'everyone' : role}`)
    }
  }

  const dropField = text.match(/\b(?:remove|delete|drop)\s+(?:the\s+)?["“']?([\w ]+?)["”']?\s*(field|column)\b/i)
  if (dropField) {
    const name = dropField[1].trim().toLowerCase()
    if (dropField[2].toLowerCase() === 'column' && config.columns) {
      const cols = config.columns.filter((c) => !name.includes(c) && !name.includes(COLUMN_LABELS[c].toLowerCase()))
      if (cols.length !== config.columns.length) {
        config.columns = cols
        notes.push(`removed the ${name} column`)
      }
    } else if (config.fields) {
      const kept = config.fields.filter((f) => f.label.toLowerCase() !== name)
      if (kept.length !== config.fields.length) {
        config.fields = kept
        notes.push(`removed the ${name} field`)
      }
    }
  }

  const oneField = text.match(/\badd\s+(?:a|an|another)?\s*["“']?([\w ]+?)["”']?\s+(field|column)\b/i)
  const named = dropField ? [] : oneField ? [oneField[1].trim()] : listAfterCue(text)
  const adding = /\b(add|include|also|capture|collect|ask for)\b/.test(lower)
  const wantsFields = config.fields !== undefined || /\bfields?\b/.test(lower)

  if (named.length > 0 && wantsFields) {
    const fields = config.fields ?? []
    if (adding) {
      const fresh = named.filter((n) => !fields.some((f) => f.label.toLowerCase() === n.toLowerCase()))
      config.fields = [...fields, ...fresh.map(toField)]
      if (fresh.length > 0) notes.push(`added ${fresh.map((f) => `“${titleCase(f)}”`).join(', ')}`)
    } else {
      config.fields = named.map(toField)
      notes.push(`set its fields to ${named.map((f) => titleCase(f)).join(', ')}`)
    }
  } else if (named.length > 0 && config.columns !== undefined) {
    const cols = toColumns(named)
    if (cols.length > 0) {
      config.columns = adding ? [...new Set([...(config.columns ?? []), ...cols])] : cols
      notes.push(`set its columns to ${config.columns.map((c) => COLUMN_LABELS[c]).join(', ')}`)
    }
  }

  const required = text.match(/\bmake\s+(?:the\s+)?["“']?([\w ]+?)["”']?\s*(?:field\s*)?(required|optional)\b/i)
  if (required && config.fields) {
    const name = required[1].trim().toLowerCase()
    const want = required[2].toLowerCase() === 'required'
    if (config.fields.some((f) => f.label.toLowerCase() === name)) {
      config.fields = config.fields.map((f) => (f.label.toLowerCase() === name ? { ...f, required: want } : f))
      notes.push(`made ${titleCase(name)} ${want ? 'required' : 'optional'}`)
    }
  }

  const rows = text.match(/\b(?:show|display|limit(?: to)?|keep)\s+(\d+)\s+rows?\b|\brow limit (?:of |to )?(\d+)/i)
  if (rows) {
    config.rowLimit = Number(rows[1] ?? rows[2])
    notes.push(`showing ${config.rowLimit} rows`)
  }

  const copy = text.match(/\b(?:text|copy|heading|note|content)\b.*?\b(?:to|say|reads?)\s+["“']?([^"”']+)["”']?$/i)
  if (copy && block.type === 'text') {
    config.text = copy[1].trim()
    notes.push('updated its text')
  }

  const button = text.match(/\bbutton(?: label| text)?\s+(?:to|say|reads?)\s+["“']?([^"”'.]+)["”']?/i)
  if (button && config.submitLabel !== undefined) {
    config.submitLabel = button[1].trim()
    notes.push(`button now reads “${config.submitLabel}”`)
  }

  const placeholder = text.match(/\bplaceholder\s+(?:to|say|reads?)\s+["“']?([^"”'.]+)["”']?/i)
  if (placeholder && block.type === 'input') {
    config.placeholder = placeholder[1].trim()
    notes.push('updated the placeholder')
  }

  const metric = text.match(/\b(?:kpi|metric)?\s*label\s+(?:to\s+)?["“']?([^"”'.]+)["”']?/i)
  if (metric && block.type === 'kpi') {
    config.metricLabel = metric[1].trim()
    notes.push(`label is now “${config.metricLabel}”`)
  }

  if (/\b(sum|total)\b/.test(lower) && block.type === 'kpi') {
    config.metricMode = 'sum'
    notes.push('now sums amounts instead of counting')
  } else if (/\bcount\b/.test(lower) && block.type === 'kpi') {
    config.metricMode = 'count'
    notes.push('now counts records')
  }

  const money = text.match(/\bbalance\s+(?:to|of|at)\s+\$?([\d,]+(?:\.\d+)?)/i)
  if (money) {
    config.startingBalance = Number(money[1].replace(/,/g, ''))
    notes.push(`starting balance is now ${config.startingBalance}`)
  }

  const sql = text.match(/\b(select\s+.+)$/i)
  if (sql && block.type === 'postgres') {
    config.sql = sql[1].trim()
    notes.push('updated the query')
  }

  const channel = text.match(/(#[\w-]+)/)
  if (channel && block.type === 'slack') {
    config.channel = channel[1]
    notes.push(`posting to ${config.channel}`)
  }

  const mail = text.match(/([\w.+-]+@[\w-]+\.[\w.]+)/)
  if (mail && block.type === 'email') {
    config.emailTo = mail[1]
    notes.push(`sending to ${config.emailTo}`)
  }

  const url = text.match(/(https?:\/\/\S+)/)
  if (url && block.type === 'webhook') {
    config.webhookUrl = url[1]
    notes.push('updated the webhook URL')
  }

  return notes.length > 0 ? out : null
}

/* ---------------- creating blocks ---------------- */

const CREATE_TYPE_HINTS: { test: RegExp; type: BlockType }[] = [
  { test: /\b(collect|capture|submit|intake|apply|onboard|request|ticket|report)\b/, type: 'form' },
  { test: /\b(track|log|list|show|browse|inventory|directory|catalog|monitor)\b/, type: 'table' },
]

const FILLER = /^(please|hey|hi|ok|okay|so)[,\s]+/i
const POLITE = /^(can you|could you|would you|i (?:need|want|would like)|we need|lets|let's)\s+/i
const VERB = /^(to\s+)?(add|build|create|make|set up|setup|give me|drop in|put|start)\s+/i

/**
 * The name the user gave the feature, minus filler and any word that already
 * names one of the blocks being created: "a KYC review queue" -> "KYC".
 */
function subjectOf(text: string, types: BlockType[]): string {
  const cleaned = headOf(text)
    .replace(FILLER, '')
    .replace(POLITE, '')
    .replace(VERB, '')
    .replace(/^(a|an|the)\s+/i, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
  const labelWords = new Set(
    types
      .flatMap((t) => LABEL_OF[t].toLowerCase().split(/\s+/))
      .concat(['new', 'me', 'us', 'please', 'internal', 'tool', 'page', 'simple']),
  )
  const words = cleaned
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.includes(w.toLowerCase()))
    .filter((w) => {
      const l = w.toLowerCase()
      return !labelWords.has(l) && !matchBlockTypes(l).some((t) => types.includes(t))
    })
    .slice(0, 3)
  return titleCase(words.join(' '))
}

function specFor(type: BlockType, subject: string, named: string[]): NewBlockSpec {
  const config: BlockConfig = defaultConfig(type)
  if (named.length > 0) {
    if (config.fields !== undefined) config.fields = named.map(toField)
    else if (config.columns !== undefined) {
      const cols = toColumns(named)
      if (cols.length > 0) config.columns = cols
    } else if (type === 'text') config.text = named.join(', ')
  }
  const label = subject ? `${subject} ${LABEL_OF[type]}` : LABEL_OF[type]
  return { type, label, config }
}

function planCreate(text: string, lower: string): AgentPlan {
  const named = listAfterCue(text)
  // Match on the head so field names ("…with contact email") don't summon connector blocks.
  const matched = matchBlockTypes(headOf(lower))
  if (matched.length > 0) {
    const subject = subjectOf(text, matched)
    return { kind: 'create', specs: matched.map((t) => specFor(t, subject, named)), note: null }
  }

  // Nothing in the palette matches — synthesize a block from the intent instead of giving up.
  const hinted = CREATE_TYPE_HINTS.find((h) => h.test.test(lower))?.type
  const types: BlockType[] = hinted
    ? hinted === 'form'
      ? ['form', 'table']
      : ['table']
    : named.length > 0
      ? ['form', 'table']
      : ['table', 'form']
  const subject = subjectOf(text, types)
  return {
    kind: 'create',
    specs: types.map((t) => specFor(t, subject, named)),
    note: 'Nothing in the palette matched exactly, so I built it out of the closest blocks and named them for you — tweak fields and columns in the Inspector.',
  }
}

/* ---------------- entry point ---------------- */

/** "add a new table" is a build request even though it starts with an edit verb. */
const CREATION_PHRASE = /\b(add|build|create|make|set up|give me|need|want)\s+(a|an|another|new|me|some)\b/

/**
 * Turn a chat prompt into a plan: edit the block the user is talking about when
 * the prompt reads like a change, otherwise create blocks (custom-named and
 * pre-filled from the prompt when the palette has no exact match).
 */
export function planPrompt(text: string, ctx: AgentContext): AgentPlan {
  const lower = text.toLowerCase()
  if (EDIT_CUES.test(lower) && ctx.blocks.length > 0) {
    const target = resolveTarget(lower, ctx)
    if (target) {
      const result = applyEdits(text, lower, target)
      if (!result && !CREATION_PHRASE.test(lower)) {
        return {
          kind: 'clarify',
          blockId: target.id,
          text: `I found “${target.label}” but wasn’t sure what to change. Try “rename it to Payouts”, “add a phone field”, “show 20 rows”, “make it admin only” — or select it and use the Inspector, which is now open on it.`,
        }
      }
      if (result) {
        const patch: BlockPatch = {
          blockId: target.id,
          ...(result.remove ? { remove: true } : { config: result.config }),
          ...(result.label ? { label: result.label } : {}),
          ...(result.role ? { role: result.role } : {}),
        }
        const summary = result.remove
          ? `Removed “${target.label}” from the board.`
          : `Updated “${result.label ?? target.label}” — ${result.notes.join('; ')}.`
        return { kind: 'edit', patch, summary }
      }
    }
  }
  return planCreate(text, lower)
}
