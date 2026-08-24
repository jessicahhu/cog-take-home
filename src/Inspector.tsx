import { useState } from 'react'
import type { Block, BlockConfig, ColumnKey, FieldType, FormField, Role, SeedRow } from './types'
import { ALL_COLUMNS, COLUMN_LABELS, defaultConfig, newFieldId } from './types'
import { RECORD_VIEW_TYPES } from './RunView'

/** Numbers are edited as free text so intermediate states like "-" or "12." survive typing. */
function AmountInput({
  value,
  onChange,
  label,
}: {
  value: number | undefined
  onChange: (v: number | undefined) => void
  label: string
}) {
  const [text, setText] = useState(value === undefined ? '' : String(value))
  return (
    <input
      className="inspector-amount"
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        const trimmed = e.target.value.trim()
        const parsed = Number(trimmed)
        onChange(trimmed === '' || Number.isNaN(parsed) ? undefined : parsed)
      }}
      inputMode="decimal"
      placeholder="Amount"
      aria-label={label}
    />
  )
}

interface Props {
  block: Block
  onChange: (id: string, config: BlockConfig) => void
  onClose: () => void
}

const FIELD_TYPES: FieldType[] = ['text', 'number', 'date', 'select', 'textarea']

const HAS_FIELDS = new Set<Block['type']>(['form', 'payment', 'refund'])
const HAS_COLUMNS = new Set<Block['type']>(['table'])
const HAS_ROW_LIMIT = new Set<Block['type']>([
  'table',
  'list',
  'chart',
  'queue',
  'transactions',
  'audit',
  'stripe',
  'sheets',
  'postgres',
  'slack',
  'email',
  'webhook',
])

const HAS_SEED_ROWS = new Set<Block['type']>([
  'table',
  'list',
  'chart',
  'queue',
  'transactions',
  'audit',
  'stripe',
  'sheets',
  'postgres',
])

const ROW_LIMIT_LABELS: Partial<Record<Block['type'], string>> = { chart: 'Bars shown' }

export default function Inspector({ block, onChange, onClose }: Props) {
  const config: BlockConfig = { ...defaultConfig(block.type), ...block.config }
  const set = (patch: Partial<BlockConfig>) => onChange(block.id, { ...config, ...patch })

  const fields = config.fields ?? []
  const setField = (id: string, patch: Partial<FormField>) =>
    set({ fields: fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) })

  const rows = config.seedRows ?? []
  const setRow = (id: string, patch: Partial<SeedRow>) =>
    set({ seedRows: rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) })

  const columns = config.columns ?? []
  const toggleColumn = (key: ColumnKey) =>
    set({
      columns: columns.includes(key) ? columns.filter((c) => c !== key) : [...ALL_COLUMNS.filter((c) => columns.includes(c) || c === key)],
    })

  return (
    <div className="inspector">
      <div className="inspector-head">
        <h2>Configure “{block.label}”</h2>
        <button className="inspector-close" onClick={onClose} aria-label="Close inspector">
          ✕
        </button>
      </div>
      <div className="inspector-body">
        {HAS_FIELDS.has(block.type) && (
          <div className="inspector-group">
            <span className="inspector-label">Fields</span>
            {fields.length === 0 && <p className="inspector-hint">No fields — the form will submit an empty record.</p>}
            {fields.map((f, i) => (
              <div key={f.id} className="inspector-field">
                <div className="inspector-field-row">
                  <input
                    value={f.label}
                    onChange={(e) => setField(f.id, { label: e.target.value })}
                    aria-label={`Field ${i + 1} label`}
                    placeholder="Field label"
                  />
                  <select
                    value={f.type}
                    onChange={(e) => setField(f.id, { type: e.target.value as FieldType })}
                    aria-label={`Field ${i + 1} type`}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <button
                    className="inspector-icon"
                    onClick={() => set({ fields: fields.filter((x) => x.id !== f.id) })}
                    title="Remove field"
                    aria-label={`Remove field ${f.label}`}
                  >
                    ✕
                  </button>
                </div>
                <div className="inspector-field-row">
                  <label className="inspector-check">
                    <input
                      type="checkbox"
                      checked={f.required}
                      onChange={(e) => setField(f.id, { required: e.target.checked })}
                    />
                    Required
                  </label>
                  {f.type === 'select' && (
                    <input
                      className="inspector-options"
                      value={(f.options ?? []).join(', ')}
                      onChange={(e) =>
                        setField(f.id, {
                          options: e.target.value
                            .split(',')
                            .map((o) => o.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="Options, comma separated"
                      aria-label={`Options for ${f.label}`}
                    />
                  )}
                </div>
              </div>
            ))}
            <button
              className="inspector-add"
              onClick={() =>
                set({
                  fields: [...fields, { id: newFieldId(), label: `Field ${fields.length + 1}`, type: 'text', required: false }],
                })
              }
            >
              + Add field
            </button>
            <label className="inspector-row">
              <span>Submit button</span>
              <input value={config.submitLabel ?? ''} onChange={(e) => set({ submitLabel: e.target.value })} />
            </label>
          </div>
        )}

        {HAS_COLUMNS.has(block.type) && (
          <div className="inspector-group">
            <span className="inspector-label">Columns</span>
            <div className="inspector-columns">
              {ALL_COLUMNS.map((key) => (
                <label key={key} className="inspector-check">
                  <input type="checkbox" checked={columns.includes(key)} onChange={() => toggleColumn(key)} />
                  {COLUMN_LABELS[key]}
                </label>
              ))}
            </div>
          </div>
        )}

        {RECORD_VIEW_TYPES.has(block.type) && (
          <label className="inspector-row">
            <span>Who sees records</span>
            <select
              value={config.dataRole ?? 'inherit'}
              onChange={(e) =>
                set({ dataRole: e.target.value === 'inherit' ? undefined : (e.target.value as Role) })
              }
            >
              <option value="inherit">Follow Access setting</option>
              <option value="everyone">Everyone signed in</option>
              <option value="ops">Ops+</option>
              <option value="admin">Admin only</option>
            </select>
          </label>
        )}

        {HAS_SEED_ROWS.has(block.type) && (
          <div className="inspector-group">
            <span className="inspector-label">Starting rows</span>
            {rows.length === 0 && <p className="inspector-hint">Starts empty — rows arrive from linked blocks.</p>}
            {rows.map((r, i) => (
              <div key={r.id} className="inspector-field">
                <div className="inspector-field-row">
                  <input
                    value={r.title}
                    onChange={(e) => setRow(r.id, { title: e.target.value })}
                    placeholder="Row label"
                    aria-label={`Row ${i + 1} title`}
                  />
                  <button
                    className="inspector-icon"
                    onClick={() => set({ seedRows: rows.filter((x) => x.id !== r.id) })}
                    title="Remove row"
                    aria-label={`Remove row ${r.title}`}
                  >
                    ✕
                  </button>
                </div>
                <div className="inspector-field-row">
                  <AmountInput
                    key={r.id}
                    value={r.amount}
                    onChange={(amount) => setRow(r.id, { amount })}
                    label={`Row ${i + 1} amount`}
                  />
                  <select
                    value={r.status ?? ''}
                    onChange={(e) =>
                      setRow(r.id, { status: e.target.value === '' ? undefined : (e.target.value as SeedRow['status']) })
                    }
                    aria-label={`Row ${i + 1} status`}
                  >
                    <option value="">no status</option>
                    <option value="pending">pending</option>
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                  </select>
                </div>
              </div>
            ))}
            <button
              className="inspector-add"
              onClick={() => set({ seedRows: [...rows, { id: newFieldId(), title: `Row ${rows.length + 1}` }] })}
            >
              + Add row
            </button>
          </div>
        )}

        {block.type === 'customer' && (
          <div className="inspector-group">
            <label className="inspector-row">
              <span>Name</span>
              <input value={config.customerName ?? ''} onChange={(e) => set({ customerName: e.target.value })} />
            </label>
            <label className="inspector-row">
              <span>Email</span>
              <input value={config.customerEmail ?? ''} onChange={(e) => set({ customerEmail: e.target.value })} />
            </label>
            <label className="inspector-row">
              <span>KYC status</span>
              <select
                value={config.kycStatus ?? 'pending'}
                onChange={(e) => set({ kycStatus: e.target.value as SeedRow['status'] })}
              >
                <option value="pending">Pending</option>
                <option value="approved">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
          </div>
        )}

        {block.type === 'card' && (
          <div className="inspector-group">
            <label className="inspector-row">
              <span>Card number</span>
              <input value={config.cardNumber ?? ''} onChange={(e) => set({ cardNumber: e.target.value })} />
            </label>
            <label className="inspector-row">
              <span>Expiry</span>
              <input value={config.cardExpiry ?? ''} onChange={(e) => set({ cardExpiry: e.target.value })} />
            </label>
          </div>
        )}

        {block.type === 'linkbank' && (
          <label className="inspector-row">
            <span>Bank</span>
            <input value={config.bankName ?? ''} onChange={(e) => set({ bankName: e.target.value })} />
          </label>
        )}

        {block.type === 'kpi' && (
          <div className="inspector-group">
            <label className="inspector-row">
              <span>Caption</span>
              <input
                value={config.metricLabel ?? ''}
                onChange={(e) => set({ metricLabel: e.target.value })}
                placeholder={block.label}
              />
            </label>
            <label className="inspector-row">
              <span>Metric</span>
              <select
                value={config.metricMode ?? 'count'}
                onChange={(e) => set({ metricMode: e.target.value as 'count' | 'sum' })}
              >
                <option value="count">Count of records</option>
                <option value="sum">Sum of amounts</option>
              </select>
            </label>
            <label className="inspector-row">
              <span>Unit</span>
              <input value={config.metricUnit ?? ''} onChange={(e) => set({ metricUnit: e.target.value })} />
            </label>
          </div>
        )}

        {block.type === 'balance' && (
          <label className="inspector-row">
            <span>Starting balance</span>
            <input
              type="number"
              value={config.startingBalance ?? 0}
              onChange={(e) => set({ startingBalance: Number(e.target.value) })}
            />
          </label>
        )}

        {block.type === 'text' && (
          <label className="inspector-row column">
            <span>Content</span>
            <textarea rows={4} value={config.text ?? ''} onChange={(e) => set({ text: e.target.value })} />
          </label>
        )}

        {block.type === 'input' && (
          <label className="inspector-row">
            <span>Placeholder</span>
            <input value={config.placeholder ?? ''} onChange={(e) => set({ placeholder: e.target.value })} />
          </label>
        )}

        {block.type === 'button' && (
          <div className="inspector-group">
            <label className="inspector-row">
              <span>Button text</span>
              <input value={config.submitLabel ?? ''} onChange={(e) => set({ submitLabel: e.target.value })} />
            </label>
            <label className="inspector-row">
              <span>Emits</span>
              <input
                value={config.emitTitle ?? ''}
                onChange={(e) => set({ emitTitle: e.target.value })}
                placeholder={`${block.label} triggered`}
              />
            </label>
          </div>
        )}

        {block.type === 'flags' && (
          <div className="inspector-group">
            <span className="inspector-label">Flags</span>
            {(config.flags ?? []).map((flag, i) => (
              <div key={i} className="inspector-field-row">
                <input
                  value={flag}
                  onChange={(e) => set({ flags: (config.flags ?? []).map((f, j) => (j === i ? e.target.value : f)) })}
                  aria-label={`Flag ${i + 1}`}
                />
                <button
                  className="inspector-icon"
                  onClick={() => set({ flags: (config.flags ?? []).filter((_, j) => j !== i) })}
                  title="Remove flag"
                  aria-label={`Remove flag ${flag}`}
                >
                  ✕
                </button>
              </div>
            ))}
            <button className="inspector-add" onClick={() => set({ flags: [...(config.flags ?? []), 'new-flag'] })}>
              + Add flag
            </button>
          </div>
        )}

        {block.type === 'slack' && (
          <label className="inspector-row">
            <span>Channel</span>
            <input value={config.channel ?? ''} onChange={(e) => set({ channel: e.target.value })} />
          </label>
        )}

        {block.type === 'email' && (
          <label className="inspector-row">
            <span>Send to</span>
            <input value={config.emailTo ?? ''} onChange={(e) => set({ emailTo: e.target.value })} />
          </label>
        )}

        {block.type === 'webhook' && (
          <label className="inspector-row">
            <span>URL</span>
            <input
              value={config.webhookUrl ?? ''}
              onChange={(e) => set({ webhookUrl: e.target.value })}
              placeholder="https://hooks.example.com/notify"
            />
          </label>
        )}

        {block.type === 'postgres' && (
          <label className="inspector-row column">
            <span>Query</span>
            <textarea rows={2} value={config.sql ?? ''} onChange={(e) => set({ sql: e.target.value })} />
          </label>
        )}

        {HAS_ROW_LIMIT.has(block.type) && (
          <label className="inspector-row">
            <span>{ROW_LIMIT_LABELS[block.type] ?? 'Rows shown'}</span>
            <input
              type="number"
              min={1}
              max={100}
              value={config.rowLimit ?? 6}
              onChange={(e) => set({ rowLimit: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })}
            />
          </label>
        )}

        <button className="inspector-reset" onClick={() => onChange(block.id, defaultConfig(block.type))}>
          Reset to defaults
        </button>
      </div>
    </div>
  )
}
