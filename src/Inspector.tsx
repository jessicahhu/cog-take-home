import type { Block, BlockConfig, ColumnKey, FieldType, FormField } from './types'
import { ALL_COLUMNS, COLUMN_LABELS, defaultConfig, newFieldId } from './types'

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

export default function Inspector({ block, onChange, onClose }: Props) {
  const config: BlockConfig = { ...defaultConfig(block.type), ...block.config }
  const set = (patch: Partial<BlockConfig>) => onChange(block.id, { ...config, ...patch })

  const fields = config.fields ?? []
  const setField = (id: string, patch: Partial<FormField>) =>
    set({ fields: fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) })

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
          <label className="inspector-row">
            <span>Button text</span>
            <input value={config.submitLabel ?? ''} onChange={(e) => set({ submitLabel: e.target.value })} />
          </label>
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
            <span>Rows shown</span>
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
