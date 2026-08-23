import { useRef } from 'react'
import type { Block } from './types'
import { PALETTE } from './types'

interface Props {
  block: Block
  selected: boolean
  onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
  onDelete: (id: string) => void
  onRename: (id: string, label: string) => void
}

function BlockPreview({ type }: { type: Block['type'] }) {
  switch (type) {
    case 'table':
      return (
        <div className="preview preview-table">
          <div className="row header" />
          <div className="row" />
          <div className="row" />
        </div>
      )
    case 'form':
      return (
        <div className="preview preview-form">
          <div className="field" />
          <div className="field" />
          <div className="submit" />
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
  }
}

export default function BlockCard({ block, selected, onSelect, onMove, onDelete, onRename }: Props) {
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input')) return
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

  return (
    <div
      className={`block-card${selected ? ' selected' : ''}${block.building ? ' building' : ''}`}
      style={{ left: block.x, top: block.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="block-header">
        <span className="block-icon">{icon}</span>
        <input
          className="block-label"
          value={block.label}
          onChange={(e) => onRename(block.id, e.target.value)}
          aria-label="Block name"
        />
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
        <BlockPreview type={block.type} />
      )}
    </div>
  )
}
