import { useRef } from 'react'
import type { Block } from './types'
import { BLOCK_IO, PALETTE, ROLE_LABELS, defaultConfig } from './types'

interface Props {
  block: Block
  selected: boolean
  linkTarget: 'valid' | 'invalid' | null
  onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
  onDelete: (id: string) => void
  onRename: (id: string, label: string) => void
  onCycleRole: (id: string) => void
  onStartLink: (id: string, e: React.PointerEvent) => void
}

function BlockPreview({ block }: { block: Block }) {
  const type = block.type
  const config = { ...defaultConfig(type), ...block.config }

  if (type === 'form' || type === 'payment' || type === 'refund') {
    const fields = config.fields ?? []
    return (
      <div className="preview preview-form">
        {fields.length === 0 && <div className="field empty">No fields</div>}
        {fields.slice(0, 4).map((f) => (
          <div key={f.id} className="field named">
            {f.label}
            {f.required ? ' *' : ''}
          </div>
        ))}
        <div className="submit">{config.submitLabel || 'Submit'}</div>
      </div>
    )
  }

  if (type === 'flags') {
    return (
      <div className="preview preview-flags">
        {(config.flags ?? []).slice(0, 4).map((flag, i) => (
          <div key={flag + i} className="flag">
            <span>{flag}</span>
            <span className={`toggle${i === 0 ? ' on' : ''}`} />
          </div>
        ))}
      </div>
    )
  }

  switch (type) {
    case 'table':
      return (
        <div className="preview preview-table">
          <div className="row header" />
          <div className="row" />
          <div className="row" />
        </div>
      )
    case 'chart':
      return (
        <div className="preview preview-chart">
          <div className="bar" style={{ height: '40%' }} />
          <div className="bar" style={{ height: '70%' }} />
          <div className="bar" style={{ height: '55%' }} />
          <div className="bar" style={{ height: '90%' }} />
        </div>
      )
    case 'kpi':
      return (
        <div className="preview preview-kpi">
          <span className="big">1,284</span>
          <span className="delta">▲ 12%</span>
        </div>
      )
    case 'list':
      return (
        <div className="preview preview-list">
          <div className="item" />
          <div className="item" />
          <div className="item" />
        </div>
      )
    case 'button':
      return (
        <div className="preview preview-button">
          <div className="btn">Run</div>
        </div>
      )
    case 'input':
      return (
        <div className="preview preview-input">
          <div className="searchbox">⌕ Search…</div>
        </div>
      )
    case 'text':
      return (
        <div className="preview preview-text">
          <div className="line wide" />
          <div className="line" />
        </div>
      )
    case 'balance':
      return (
        <div className="preview preview-balance">
          <span className="caption">Available balance</span>
          <span className="amount">$4,562.90</span>
          <span className="delta">▲ $210 this week</span>
        </div>
      )
    case 'transactions':
      return (
        <div className="preview preview-transactions">
          <div className="txn">
            <span>Blue Bottle</span>
            <span className="debit">−$6.40</span>
          </div>
          <div className="txn">
            <span>Payroll</span>
            <span className="credit">+$2,150.00</span>
          </div>
          <div className="txn">
            <span>Lyft</span>
            <span className="debit">−$18.25</span>
          </div>
        </div>
      )
    case 'card':
      return (
        <div className="preview preview-card">
          <div className="chip" />
          <div className="number">•••• 4242</div>
          <div className="meta">
            <span>EXP 09/29</span>
            <span className="freeze">Freeze</span>
          </div>
        </div>
      )
    case 'linkbank':
      return (
        <div className="preview preview-linkbank">
          <div className="bank">🏦 Chase •••6841</div>
          <div className="connect">+ Link account</div>
        </div>
      )
    case 'customer':
      return (
        <div className="preview preview-customer">
          <div className="who">
            <span className="avatar">JD</span>
            <span>
              <span className="name">Jane Doe</span>
              <span className="email">jane@acme.com</span>
            </span>
          </div>
          <div className="kyc">KYC: Verified</div>
        </div>
      )
    case 'queue':
      return (
        <div className="preview preview-queue">
          <div className="case">
            <span>Case #4821</span>
            <span className="actions">
              <span className="approve">✓</span>
              <span className="reject">✕</span>
            </span>
          </div>
          <div className="case">
            <span>Case #4822</span>
            <span className="actions">
              <span className="approve">✓</span>
              <span className="reject">✕</span>
            </span>
          </div>
        </div>
      )
    case 'audit':
      return (
        <div className="preview preview-audit">
          <div className="entry">
            <span className="when">2m</span> ana approved case #4821
          </div>
          <div className="entry">
            <span className="when">1h</span> sam enabled new-onboarding
          </div>
        </div>
      )
    case 'stripe':
      return (
        <div className="preview preview-transactions">
          <div className="txn">
            <span>ch_3Ok… Acme Inc</span>
            <span className="credit">+$149.00</span>
          </div>
          <div className="txn">
            <span>Payout → bank</span>
            <span className="debit">−$1,320.00</span>
          </div>
        </div>
      )
    case 'postgres':
      return (
        <div className="preview preview-connector">
          <div className="conn-query">SELECT * FROM users…</div>
          <div className="row" />
          <div className="row" />
        </div>
      )
    case 'sheets':
      return (
        <div className="preview preview-table">
          <div className="row header" />
          <div className="row" />
          <div className="row" />
        </div>
      )
    case 'slack':
      return (
        <div className="preview preview-connector">
          <div className="conn-channel">#ops-alerts</div>
          <div className="conn-msg">◆ New refund issued — $25.00</div>
        </div>
      )
    case 'email':
      return (
        <div className="preview preview-connector">
          <div className="conn-msg">✉ to: ops@company.com</div>
          <div className="conn-msg muted">subject: Case #4821 approved</div>
        </div>
      )
    case 'webhook':
      return (
        <div className="preview preview-connector">
          <div className="conn-query">POST https://hooks…</div>
          <div className="conn-msg muted">delivers linked activity</div>
        </div>
      )
  }
}

export default function BlockCard({
  block,
  selected,
  linkTarget,
  onSelect,
  onMove,
  onDelete,
  onRename,
  onCycleRole,
  onStartLink,
}: Props) {
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const io = BLOCK_IO[block.type]

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, .port')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: block.x, origY: block.y }
    onSelect(block.id)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return
    const { startX, startY, origX, origY } = dragState.current
    onMove(block.id, Math.max(0, origX + e.clientX - startX), Math.max(0, origY + e.clientY - startY))
  }

  const handlePointerUp = () => {
    dragState.current = null
  }

  const icon = PALETTE.find((p) => p.type === block.type)?.icon ?? '▦'

  const targetClass = linkTarget === 'valid' ? ' link-valid' : linkTarget === 'invalid' ? ' link-invalid' : ''

  return (
    <div
      className={`block-card${selected ? ' selected' : ''}${block.building ? ' building' : ''}${targetClass}`}
      style={{ left: block.x, top: block.y }}
      data-block-id={block.id}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {io.accepts.length > 0 && <span className="port port-in" title="Input — receives data from links" />}
      {io.emits !== null && (
        <span
          className="port port-out"
          title="Output — drag to another block to link"
          onPointerDown={(e) => {
            e.stopPropagation()
            onStartLink(block.id, e)
          }}
        />
      )}
      <div className="block-header">
        <span className="block-icon">{icon}</span>
        <input
          className="block-label"
          value={block.label}
          onChange={(e) => onRename(block.id, e.target.value)}
          aria-label="Block name"
        />
        <button
          className={`role-badge${(block.role ?? 'everyone') !== 'everyone' ? ' gated' : ''}`}
          onClick={() => onCycleRole(block.id)}
          title={`Visible to: ${ROLE_LABELS[block.role ?? 'everyone']} — click to change`}
          aria-label={`Change access for ${block.label} (currently ${ROLE_LABELS[block.role ?? 'everyone']})`}
        >
          {(block.role ?? 'everyone') === 'everyone' ? 'All' : block.role === 'ops' ? 'Ops' : 'Adm'}
        </button>
        <button className="block-delete" onClick={() => onDelete(block.id)} aria-label="Delete block">
          ✕
        </button>
      </div>
      {block.building ? (
        <div className="block-building">
          <span className="spinner" />
          Devin is building…
        </div>
      ) : (
        <BlockPreview block={block} />
      )}
    </div>
  )
}
