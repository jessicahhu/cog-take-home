import { useCallback, useRef, useState } from 'react'
import BlockCard from './BlockCard'
import type { Block, BlockType } from './types'
import { PALETTE, blocksFromPrompt } from './types'
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
}

export default function App() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

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
    setStatus(`Devin is creating ${types.length} feature${types.length > 1 ? 's' : ''}…`)
    const rect = canvasRef.current?.getBoundingClientRect()
    const baseX = rect ? Math.max(40, rect.width / 2 - (types.length * 240) / 2) : 80
    const ids = types.map((type, i) => addBlock(type, baseX + i * 250, 120 + (i % 2) * 40, true))
    window.setTimeout(() => {
      setBlocks((prev) => prev.map((b) => (ids.includes(b.id) ? { ...b, building: false } : b)))
      setStatus(null)
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
          <h2>Features</h2>
          <p className="palette-hint">Drag onto the board</p>
          {PALETTE.map((item) => (
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
              <p>Drag a feature from the left, or ask Devin below.</p>
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
      </div>

      <form className="prompt-bar" onSubmit={handlePrompt}>
        {status && <div className="prompt-status">{status}</div>}
        <input
          className="prompt-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask Devin to create a feature… e.g. “a table of support tickets with a search filter and a chart”"
        />
        <button className="prompt-submit" type="submit" disabled={!prompt.trim()}>
          Create
        </button>
      </form>
    </div>
  )
}
