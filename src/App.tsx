import { useCallback, useEffect, useRef, useState } from 'react'
import BlockCard from './BlockCard'
import type { Block, BlockType } from './types'
import { PALETTE, SECTION_TITLES, blocksFromPrompt } from './types'
import './App.css'

let nextId = 1
const newId = () => `block-${nextId++}`

const LABELS: Record<BlockType, string> = {
  table: 'Data Table',
  form: 'Form',
  chart: 'Chart',
  kpi: 'KPI Card',
  list: 'List',
  button: 'Action Button',
  input: 'Search Input',
  text: 'Text Block',
  balance: 'Balance Card',
  transactions: 'Transaction Feed',
  payment: 'Payment Form',
  card: 'Virtual Card',
  linkbank: 'Link Bank Account',
  customer: 'Customer Info',
  queue: 'Review Queue',
  refund: 'Refund Action',
  flags: 'Feature Flags',
  audit: 'Audit Log',
}

interface ChatMessage {
  id: string
  role: 'user' | 'devin'
  text: string
  pending?: boolean
}

const SECTIONS = ['general', 'fintech', 'ops'] as const

export default function App() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'devin',
      text: 'Hi! Describe the internal tool you need — e.g. “a KYC review queue with customer info and an audit log” — and I’ll add the features to your board.',
    },
  ])
  const canvasRef = useRef<HTMLDivElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addBlock = useCallback((type: BlockType, x: number, y: number, building = false) => {
    const id = newId()
    setBlocks((prev) => [...prev, { id, type, label: LABELS[type], x, y, building }])
    return id
  }, [])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('block-type') as BlockType
    if (!type) return
    const rect = canvasRef.current!.getBoundingClientRect()
    addBlock(type, Math.max(0, e.clientX - rect.left - 110), Math.max(0, e.clientY - rect.top - 20))
  }

  const handleMove = useCallback((id: string, x: number, y: number) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, x, y } : b)))
  }, [])

  const handleDelete = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
    setSelectedId((sel) => (sel === id ? null : sel))
  }, [])

  const handleRename = useCallback((id: string, label: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, label } : b)))
  }, [])

  const handlePrompt = (e: React.FormEvent) => {
    e.preventDefault()
    const text = prompt.trim()
    if (!text) return
    setPrompt('')
    const types = blocksFromPrompt(text)
    const userMsg: ChatMessage = { id: newId(), role: 'user', text }
    const pendingMsg: ChatMessage = {
      id: newId(),
      role: 'devin',
      text: `Building ${types.length} feature${types.length > 1 ? 's' : ''}…`,
      pending: true,
    }
    setMessages((prev) => [...prev, userMsg, pendingMsg])
    const rect = canvasRef.current?.getBoundingClientRect()
    const baseX = rect ? Math.max(40, rect.width / 2 - (types.length * 240) / 2) : 80
    const ids = types.map((type, i) => addBlock(type, baseX + i * 250, 120 + (i % 2) * 40, true))
    window.setTimeout(() => {
      setBlocks((prev) => prev.map((b) => (ids.includes(b.id) ? { ...b, building: false } : b)))
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingMsg.id
            ? {
                ...m,
                pending: false,
                text: `Added ${types.map((t) => LABELS[t]).join(', ')} to your board. Drag them into place, or tell me what to build next.`,
              }
            : m,
        ),
      )
    }, 1500)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">◆</span>
          <span className="brand-name">Toolboard</span>
          <span className="brand-sub">internal tool builder</span>
        </div>
        <div className="topbar-actions">
          <span className="block-count">
            {blocks.length} block{blocks.length === 1 ? '' : 's'}
          </span>
          <button className="clear-btn" onClick={() => setBlocks([])} disabled={blocks.length === 0}>
            Clear board
          </button>
        </div>
      </header>

      <div className="body">
        <aside className="palette">
          <p className="palette-hint">Drag onto the board</p>
          {SECTIONS.map((section) => (
            <section key={section}>
              <h2>{SECTION_TITLES[section]}</h2>
              {PALETTE.filter((item) => item.section === section).map((item) => (
                <div
                  key={item.type}
                  className="palette-item"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('block-type', item.type)}
                >
                  <span className="palette-icon">{item.icon}</span>
                  <span>
                    <span className="palette-label">{item.label}</span>
                    <span className="palette-desc">{item.description}</span>
                  </span>
                </div>
              ))}
            </section>
          ))}
        </aside>

        <main
          className="canvas"
          ref={canvasRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onPointerDown={(e) => {
            if (e.target === canvasRef.current) setSelectedId(null)
          }}
        >
          {blocks.length === 0 && (
            <div className="empty-state">
              <p className="empty-title">Your whiteboard is empty</p>
              <p>Drag a feature from the left, or ask Devin on the right.</p>
            </div>
          )}
          {blocks.map((block) => (
            <BlockCard
              key={block.id}
              block={block}
              selected={selectedId === block.id}
              onSelect={setSelectedId}
              onMove={handleMove}
              onDelete={handleDelete}
              onRename={handleRename}
            />
          ))}
        </main>

        <aside className="chat">
          <div className="chat-header">
            <span className="chat-avatar">◆</span>
            <span>
              <span className="chat-title">Devin</span>
              <span className="chat-sub">describe features to build</span>
            </span>
          </div>
          <div className="chat-messages">
            {messages.map((m) => (
              <div key={m.id} className={`chat-msg ${m.role}${m.pending ? ' pending' : ''}`}>
                {m.pending && <span className="spinner" />}
                {m.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form className="chat-input-row" onSubmit={handlePrompt}>
            <input
              className="chat-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask Devin to create a feature…"
            />
            <button className="chat-send" type="submit" disabled={!prompt.trim()}>
              Send
            </button>
          </form>
        </aside>
      </div>
    </div>
  )
}
