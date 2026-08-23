import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BackendConfig, Block, Link, Page } from './types'
import { BLOCK_IO, PALETTE } from './types'

export interface RuntimeRecord {
  id: string
  at: number
  source: string
  title: string
  amount?: number
  status?: 'pending' | 'approved' | 'rejected'
}

type DataMap = Record<string, RuntimeRecord[]>

interface Props {
  toolName: string
  blocks: Block[]
  links: Link[]
  pages: Page[]
  backend: BackendConfig
  onExit: () => void
}

const RUN_STORAGE_KEY = 'toolboard-run-data'

let recId = 1
const newRecId = () => `rec-${Date.now()}-${recId++}`

function seedData(blocks: Block[]): DataMap {
  const data: DataMap = {}
  for (const block of blocks) {
    if (block.type === 'queue') {
      data[block.id] = [
        { id: newRecId(), at: Date.now() - 3600_000, source: block.label, title: 'Case #4821 — ID document review', status: 'pending' },
        { id: newRecId(), at: Date.now() - 1800_000, source: block.label, title: 'Case #4822 — address mismatch', status: 'pending' },
      ]
    } else if (block.type === 'transactions') {
      data[block.id] = [
        { id: newRecId(), at: Date.now() - 7200_000, source: block.label, title: 'Payroll', amount: 2150 },
        { id: newRecId(), at: Date.now() - 5400_000, source: block.label, title: 'Blue Bottle', amount: -6.4 },
        { id: newRecId(), at: Date.now() - 3600_000, source: block.label, title: 'Lyft', amount: -18.25 },
      ]
    } else {
      data[block.id] = []
    }
  }
  return data
}

function loadBrowserData(blocks: Block[]): DataMap | null {
  try {
    const raw = localStorage.getItem(RUN_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const map = parsed as DataMap
    if (!blocks.some((b) => Array.isArray(map[b.id]) && map[b.id].length > 0)) return null
    const data = seedData(blocks)
    for (const block of blocks) {
      if (Array.isArray(map[block.id])) data[block.id] = map[block.id]
    }
    return data
  } catch {
    return null
  }
}

function timeAgo(at: number): string {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.round(s / 60)}m`
  return `${Math.round(s / 3600)}h`
}

const money = (n: number) =>
  `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function RunView({ toolName, blocks, links, pages, backend, onExit }: Props) {
  const [data, setData] = useState<DataMap>(() =>
    backend.kind === 'browser' ? (loadBrowserData(blocks) ?? seedData(blocks)) : seedData(blocks),
  )
  const [queries, setQueries] = useState<Record<string, string>>({})
  const [texts, setTexts] = useState<Record<string, string>>({})
  const [frozen, setFrozen] = useState<Record<string, boolean>>({})
  const [linked, setLinked] = useState<Record<string, boolean>>({})
  const [flagState, setFlagState] = useState<Record<string, Record<string, boolean>>>({})
  const [activePage, setActivePage] = useState(pages[0]?.id ?? '')
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'unreachable' | null>(
    backend.kind === 'rest' ? 'checking' : null,
  )
  const apiOkRef = useRef(false)

  useEffect(() => {
    if (backend.kind !== 'rest') return
    let cancelled = false
    fetch(backend.restUrl, { method: 'GET' })
      .then((res) => {
        if (cancelled) return
        apiOkRef.current = res.ok
        setApiStatus(res.ok ? 'ok' : 'unreachable')
      })
      .catch(() => {
        if (cancelled) return
        setApiStatus('unreachable')
      })
    return () => {
      cancelled = true
    }
  }, [backend])

  useEffect(() => {
    if (backend.kind !== 'browser') return
    localStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(data))
  }, [backend.kind, data])

  /** Blocks whose output links into `id` (pull-based data flow). */
  const sourcesOf = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const link of links) {
      ;(map[link.to] ??= []).push(link.from)
    }
    return map
  }, [links])

  const blockById = useMemo(() => new Map(blocks.map((b) => [b.id, b])), [blocks])

  const datasetFor = useCallback(
    (id: string): RuntimeRecord[] => {
      const own = data[id] ?? []
      const inbound = (sourcesOf[id] ?? [])
        .filter((src) => {
          const type = blockById.get(src)?.type
          return type !== undefined && BLOCK_IO[type].emits !== 'query'
        })
        .flatMap((src) => data[src] ?? [])
      return [...own, ...inbound].sort((a, b) => a.at - b.at)
    },
    [data, sourcesOf, blockById],
  )

  const queryFor = useCallback(
    (id: string): string => {
      for (const src of sourcesOf[id] ?? []) {
        if (blockById.get(src)?.type === 'input') {
          const q = queries[src]?.trim()
          if (q) return q.toLowerCase()
        }
      }
      return ''
    },
    [sourcesOf, blockById, queries],
  )

  const emit = useCallback(
    (blockId: string, record: Omit<RuntimeRecord, 'id' | 'at' | 'source'>) => {
      const source = blockById.get(blockId)?.label ?? 'Unknown'
      const full: RuntimeRecord = { ...record, id: newRecId(), at: Date.now(), source }
      setData((prev) => ({ ...prev, [blockId]: [...(prev[blockId] ?? []), full] }))
      if (backend.kind === 'rest' && apiOkRef.current) {
        fetch(backend.restUrl.replace(/\/$/, '') + '/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(full),
        }).catch(() => {})
      }
    },
    [blockById, backend],
  )

  const setStatus = useCallback((recordId: string, status: 'approved' | 'rejected') => {
    setData((prev) => {
      const next: DataMap = {}
      for (const [key, rows] of Object.entries(prev)) {
        next[key] = rows.map((r) => (r.id === recordId ? { ...r, status } : r))
      }
      return next
    })
  }, [])

  const resetData = () => {
    if (backend.kind === 'browser') localStorage.removeItem(RUN_STORAGE_KEY)
    setData(seedData(blocks))
  }

  const pageBlocks = blocks.filter((b) => b.pageId === activePage)

  return (
    <div className="run-view">
      <header className="run-topbar">
        <div className="brand">
          <span className="brand-mark">◆</span>
          <span className="brand-name">{toolName}</span>
          <span className="run-badge">running</span>
        </div>
        <nav className="run-pages">
          {pages.map((page) => (
            <button
              key={page.id}
              className={`run-page-tab${page.id === activePage ? ' active' : ''}`}
              onClick={() => setActivePage(page.id)}
            >
              {page.name}
            </button>
          ))}
        </nav>
        <div className="topbar-actions">
          {apiStatus === 'ok' && <span className="api-status ok">API connected</span>}
          {apiStatus === 'unreachable' && (
            <span className="api-status bad">API unreachable — using in-memory data</span>
          )}
          {apiStatus === 'checking' && <span className="api-status">checking API…</span>}
          <button className="clear-btn" onClick={resetData}>
            Reset data
          </button>
          <button className="clear-btn primary" onClick={onExit}>
            Exit to builder
          </button>
        </div>
      </header>
      <main className="run-canvas">
        {pageBlocks.length === 0 && (
          <div className="empty-state">
            <p className="empty-title">This page is empty</p>
            <p>Exit to the builder to add blocks to it.</p>
          </div>
        )}
        {pageBlocks.map((block) => (
          <RuntimeBlock
            key={block.id}
            block={block}
            dataset={datasetFor(block.id)}
            query={queryFor(block.id)}
            queryValue={queries[block.id] ?? ''}
            onQuery={(v) => setQueries((prev) => ({ ...prev, [block.id]: v }))}
            text={texts[block.id] ?? 'Double-click to edit this note.'}
            onText={(v) => setTexts((prev) => ({ ...prev, [block.id]: v }))}
            frozen={frozen[block.id] ?? false}
            onFreeze={(v) => {
              setFrozen((prev) => ({ ...prev, [block.id]: v }))
              emit(block.id, { title: v ? 'Card frozen' : 'Card unfrozen' })
            }}
            linkedBank={linked[block.id] ?? false}
            onLinkBank={() => {
              setLinked((prev) => ({ ...prev, [block.id]: true }))
              emit(block.id, { title: 'Linked bank account Chase •••6841' })
            }}
            flags={flagState[block.id] ?? { 'new-onboarding': true, 'instant-transfers': false }}
            onFlag={(flag, on) => {
              setFlagState((prev) => ({
                ...prev,
                [block.id]: { ...(prev[block.id] ?? { 'new-onboarding': true, 'instant-transfers': false }), [flag]: on },
              }))
              emit(block.id, { title: `${flag} → ${on ? 'on' : 'off'}` })
            }}
            emit={(record) => emit(block.id, record)}
            setStatus={setStatus}
          />
        ))}
      </main>
    </div>
  )
}

interface RuntimeBlockProps {
  block: Block
  dataset: RuntimeRecord[]
  query: string
  queryValue: string
  onQuery: (v: string) => void
  text: string
  onText: (v: string) => void
  frozen: boolean
  onFreeze: (v: boolean) => void
  linkedBank: boolean
  onLinkBank: () => void
  flags: Record<string, boolean>
  onFlag: (flag: string, on: boolean) => void
  emit: (record: Omit<RuntimeRecord, 'id' | 'at' | 'source'>) => void
  setStatus: (recordId: string, status: 'approved' | 'rejected') => void
}

function RuntimeBlock(props: RuntimeBlockProps) {
  const { block } = props
  const icon = PALETTE.find((p) => p.type === block.type)?.icon ?? '▦'
  return (
    <div className="run-block" style={{ left: block.x, top: block.y }}>
      <div className="run-block-header">
        <span className="block-icon">{icon}</span>
        <span className="run-block-title">{block.label}</span>
      </div>
      <div className="run-block-body">
        <RuntimeBody {...props} />
      </div>
    </div>
  )
}

function RuntimeBody(props: RuntimeBlockProps) {
  const { block, dataset, query } = props
  const filtered = query ? dataset.filter((r) => r.title.toLowerCase().includes(query)) : dataset

  switch (block.type) {
    case 'form':
      return <RunForm emit={props.emit} />
    case 'payment':
      return <RunPayment emit={props.emit} />
    case 'refund':
      return <RunRefund emit={props.emit} />
    case 'table':
      return (
        <div className="run-table">
          {filtered.length === 0 && <p className="run-empty">No records yet.</p>}
          {filtered.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Amount</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(-6).map((r) => (
                  <tr key={r.id}>
                    <td>{r.title}</td>
                    <td>{r.amount !== undefined ? money(r.amount) : '—'}</td>
                    <td>{timeAgo(r.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )
    case 'list':
      return (
        <div className="run-list">
          {filtered.length === 0 && <p className="run-empty">Nothing here yet.</p>}
          {filtered.slice(-6).map((r) => (
            <div key={r.id} className="run-list-item">
              <span>{r.title}</span>
              <span className="run-when">{timeAgo(r.at)}</span>
            </div>
          ))}
        </div>
      )
    case 'chart': {
      const amounts = dataset.filter((r) => r.amount !== undefined).slice(-8)
      const values = amounts.length > 0 ? amounts.map((r) => Math.abs(r.amount!)) : [40, 70, 55, 90]
      const max = Math.max(...values)
      return (
        <div className="preview preview-chart">
          {values.map((v, i) => (
            <div key={i} className="bar" style={{ height: `${Math.max(8, (v / max) * 100)}%` }} />
          ))}
        </div>
      )
    }
    case 'kpi':
      return (
        <div className="preview preview-kpi">
          <span className="big">{dataset.length.toLocaleString()}</span>
          <span className="delta">records</span>
        </div>
      )
    case 'button':
      return (
        <div className="preview preview-button">
          <button className="run-action-btn" onClick={() => props.emit({ title: `${block.label} triggered` })}>
            Run
          </button>
        </div>
      )
    case 'input':
      return (
        <div className="run-input">
          <input
            value={props.queryValue}
            onChange={(e) => props.onQuery(e.target.value)}
            placeholder="⌕ Filter linked blocks…"
          />
        </div>
      )
    case 'text':
      return (
        <textarea className="run-text" value={props.text} onChange={(e) => props.onText(e.target.value)} rows={3} />
      )
    case 'balance': {
      const total = 2500 + dataset.reduce((sum, r) => sum + (r.amount ?? 0), 0)
      return (
        <div className="preview preview-balance">
          <span className="caption">Available balance</span>
          <span className="amount">{money(total)}</span>
          <span className="delta">{dataset.length} linked movement{dataset.length === 1 ? '' : 's'}</span>
        </div>
      )
    }
    case 'transactions':
      return (
        <div className="run-list">
          {filtered.length === 0 && <p className="run-empty">No transactions yet.</p>}
          {filtered.slice(-6).map((r) => (
            <div key={r.id} className="run-list-item">
              <span>{r.title}</span>
              <span className={r.amount !== undefined && r.amount >= 0 ? 'run-credit' : 'run-debit'}>
                {r.amount !== undefined ? money(r.amount) : ''}
              </span>
            </div>
          ))}
        </div>
      )
    case 'card':
      return (
        <div className={`preview preview-card${props.frozen ? ' frozen' : ''}`}>
          <div className="chip" />
          <div className="number">{props.frozen ? '•••• ····' : '•••• 4242'}</div>
          <div className="meta">
            <span>EXP 09/29</span>
            <button className="run-freeze" onClick={() => props.onFreeze(!props.frozen)}>
              {props.frozen ? 'Unfreeze' : 'Freeze'}
            </button>
          </div>
        </div>
      )
    case 'linkbank':
      return (
        <div className="run-linkbank">
          {props.linkedBank ? (
            <div className="bank">🏦 Chase •••6841 — connected</div>
          ) : (
            <button className="run-connect" onClick={props.onLinkBank}>
              + Link account
            </button>
          )}
        </div>
      )
    case 'customer': {
      const latest = dataset[dataset.length - 1]
      return (
        <div className="preview preview-customer">
          <div className="who">
            <span className="avatar">{latest ? latest.title.slice(0, 2).toUpperCase() : 'JD'}</span>
            <span>
              <span className="name">{latest ? latest.title : 'Jane Doe'}</span>
              <span className="email">{latest ? `via ${latest.source}` : 'jane@acme.com'}</span>
            </span>
          </div>
          <div className="kyc">
            {latest?.status === 'approved' ? 'KYC: Verified' : latest?.status === 'rejected' ? 'KYC: Rejected' : 'KYC: Pending'}
          </div>
        </div>
      )
    }
    case 'queue':
      return (
        <div className="run-queue">
          {filtered.length === 0 && <p className="run-empty">Queue is empty.</p>}
          {filtered.slice(-5).map((r) => (
            <div key={r.id} className="run-case">
              <span className={`run-case-title${r.status && r.status !== 'pending' ? ` ${r.status}` : ''}`}>
                {r.title}
              </span>
              {(!r.status || r.status === 'pending') ? (
                <span className="actions">
                  <button className="approve" onClick={() => props.setStatus(r.id, 'approved')} aria-label={`Approve ${r.title}`}>
                    ✓
                  </button>
                  <button className="reject" onClick={() => props.setStatus(r.id, 'rejected')} aria-label={`Reject ${r.title}`}>
                    ✕
                  </button>
                </span>
              ) : (
                <span className={`run-status ${r.status}`}>{r.status}</span>
              )}
            </div>
          ))}
        </div>
      )
    case 'flags':
      return (
        <div className="run-flags">
          {Object.entries(props.flags).map(([flag, on]) => (
            <div key={flag} className="flag">
              <span>{flag}</span>
              <button
                className={`run-toggle${on ? ' on' : ''}`}
                onClick={() => props.onFlag(flag, !on)}
                aria-label={`Toggle ${flag}`}
              />
            </div>
          ))}
        </div>
      )
    case 'audit':
      return (
        <div className="run-audit">
          {dataset.length === 0 && <p className="run-empty">No activity yet.</p>}
          {[...dataset].reverse().slice(0, 6).map((r) => (
            <div key={r.id} className="entry">
              <span className="when">{timeAgo(r.at)}</span> {r.source}: {r.title}
              {r.status && r.status !== 'pending' ? ` (${r.status})` : ''}
            </div>
          ))}
        </div>
      )
  }
}

function RunForm({ emit }: { emit: RuntimeBlockProps['emit'] }) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  return (
    <form
      className="run-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        const parsed = parseFloat(amount)
        emit({ title: title.trim(), amount: Number.isFinite(parsed) ? parsed : undefined })
        setTitle('')
        setAmount('')
      }}
    >
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (optional)" inputMode="decimal" />
      <button type="submit" disabled={!title.trim()}>
        Submit
      </button>
    </form>
  )
}

function RunPayment({ emit }: { emit: RuntimeBlockProps['emit'] }) {
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const parsed = parseFloat(amount)
  const valid = to.trim() !== '' && Number.isFinite(parsed) && parsed > 0
  return (
    <form
      className="run-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        emit({ title: `Payment to ${to.trim()}`, amount: -parsed })
        setTo('')
        setAmount('')
      }}
    >
      <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To: @recipient" />
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="$ 0.00" inputMode="decimal" />
      <button type="submit" disabled={!valid}>
        Send
      </button>
    </form>
  )
}

function RunRefund({ emit }: { emit: RuntimeBlockProps['emit'] }) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const parsed = parseFloat(amount)
  const valid = Number.isFinite(parsed) && parsed > 0 && reason.trim() !== ''
  return (
    <form
      className="run-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        emit({ title: `Refund: ${reason.trim()}`, amount: parsed })
        setAmount('')
        setReason('')
      }}
    >
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="$ 0.00" inputMode="decimal" />
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" />
      <button type="submit" className="danger" disabled={!valid}>
        Issue refund
      </button>
    </form>
  )
}
