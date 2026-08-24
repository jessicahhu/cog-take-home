import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BlockCard from './BlockCard'
import Inspector from './Inspector'
import RunView from './RunView'
import type {
  AuthConfig,
  BackendConfig,
  BackendKind,
  Block,
  BlockConfig,
  BlockType,
  Link,
  Page,
  Role,
  SavedTool,
} from './types'
import {
  BACKEND_HINTS,
  BACKEND_LABELS,
  DEMO_USERS,
  ROLE_LABELS,
  PALETTE,
  SECTION_TITLES,
  blocksFromPrompt,
  canLink,
  compileTool,
  defaultConfig,
  isHttpBackend,
  loadSavedTools,
  parseSavedTool,
  persistSavedTools,
} from './types'
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
  stripe: 'Stripe Payments',
  postgres: 'Postgres Query',
  sheets: 'Google Sheet',
  slack: 'Slack Notify',
  email: 'Email Sender',
  webhook: 'Webhook Out',
}

const NEXT_ROLE: Record<Role, Role> = { everyone: 'ops', ops: 'admin', admin: 'everyone' }

interface ChatMessage {
  id: string
  role: 'user' | 'devin'
  text: string
  pending?: boolean
}

const SECTIONS = ['general', 'fintech', 'ops', 'connectors'] as const
type Section = (typeof SECTIONS)[number]
type PanelKey = Section | 'tools' | 'sitemap' | 'backend' | 'access'

/** Wire anchor: vertical center of the block header. */
const PORT_Y = 21
const BLOCK_W = 220

interface LinkingState {
  fromId: string
  x: number
  y: number
  targetId: string | null
}

export default function App() {
  const [pages, setPages] = useState<Page[]>([{ id: 'page-1', name: 'Main' }])
  const [activePageId, setActivePageId] = useState('page-1')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [backend, setBackend] = useState<BackendConfig>({ kind: 'memory', restUrl: '' })
  const [auth, setAuth] = useState<AuthConfig>({ required: false })
  const [running, setRunning] = useState(false)
  const [toolName, setToolName] = useState('Untitled tool')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [linking, setLinking] = useState<LinkingState | null>(null)
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'devin',
      text: 'Hi! Describe the internal tool you need — e.g. “a KYC review queue with customer info and an audit log” — and I’ll add the features to your board. Link blocks by dragging from a block’s right-side port, then hit Compile & Run to use the tool.',
    },
  ])
  const [collapsed, setCollapsed] = useState<Record<PanelKey, boolean>>({
    sitemap: false,
    backend: false,
    access: false,
    tools: true,
    general: false,
    fintech: false,
    ops: false,
    connectors: false,
  })
  const [savedTools, setSavedTools] = useState<SavedTool[]>(loadSavedTools)
  const canvasRef = useRef<HTMLDivElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleSection = (section: PanelKey) =>
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }))

  useEffect(() => {
    persistSavedTools(savedTools)
  }, [savedTools])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const blockById = useMemo(() => new Map(blocks.map((b) => [b.id, b])), [blocks])
  const pageBlocks = blocks.filter((b) => b.pageId === activePageId)
  const pageLinks = links.filter(
    (l) => blockById.get(l.from)?.pageId === activePageId && blockById.get(l.to)?.pageId === activePageId,
  )

  const say = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: newId(), role: 'devin', text }])
  }, [])

  const addBlock = useCallback(
    (type: BlockType, x: number, y: number, building = false) => {
      const id = newId()
      setBlocks((prev) => [
        ...prev,
        { id, type, label: LABELS[type], x, y, pageId: activePageId, config: defaultConfig(type), building },
      ])
      return id
    },
    [activePageId],
  )

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('block-type') as BlockType
    if (!type) return
    const el = canvasRef.current!
    const rect = el.getBoundingClientRect()
    addBlock(
      type,
      Math.max(0, e.clientX - rect.left + el.scrollLeft - 110),
      Math.max(0, e.clientY - rect.top + el.scrollTop - 20),
    )
  }

  const handleMove = useCallback((id: string, x: number, y: number) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, x, y } : b)))
  }, [])

  const handleDelete = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
    setLinks((prev) => prev.filter((l) => l.from !== id && l.to !== id))
    setSelectedId((sel) => (sel === id ? null : sel))
  }, [])

  const handleRename = useCallback((id: string, label: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, label } : b)))
  }, [])

  const handleConfigChange = useCallback((id: string, config: BlockConfig) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, config } : b)))
  }, [])

  const handleCycleRole = useCallback((id: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, role: NEXT_ROLE[b.role ?? 'everyone'] } : b)))
  }, [])

  const cyclePageRole = (id: string) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, role: NEXT_ROLE[p.role ?? 'everyone'] } : p)))
  }

  /* ---------- linking ---------- */

  const canvasPoint = (clientX: number, clientY: number) => {
    const el = canvasRef.current!
    const rect = el.getBoundingClientRect()
    return { x: clientX - rect.left + el.scrollLeft, y: clientY - rect.top + el.scrollTop }
  }

  const handleStartLink = useCallback((id: string, e: React.PointerEvent) => {
    const { x, y } = canvasPoint(e.clientX, e.clientY)
    setLinking({ fromId: id, x, y, targetId: null })
  }, [])

  useEffect(() => {
    if (!linking) return
    const findTarget = (clientX: number, clientY: number): string | null => {
      const el = document.elementFromPoint(clientX, clientY)?.closest('[data-block-id]')
      const id = el?.getAttribute('data-block-id') ?? null
      return id && id !== linking.fromId ? id : null
    }
    const onMove = (e: PointerEvent) => {
      const { x, y } = canvasPoint(e.clientX, e.clientY)
      setLinking((prev) => (prev ? { ...prev, x, y, targetId: findTarget(e.clientX, e.clientY) } : prev))
    }
    const onUp = (e: PointerEvent) => {
      const targetId = findTarget(e.clientX, e.clientY)
      setLinking(null)
      if (!targetId) return
      const from = blockById.get(linking.fromId)
      const to = blockById.get(targetId)
      if (!from || !to) return
      if (!canLink(from.type, to.type)) {
        say(`"${from.label}" can’t link to "${to.label}" — ${to.label} doesn’t accept what ${from.label} emits.`)
        return
      }
      setLinks((prev) =>
        prev.some((l) => l.from === linking.fromId && l.to === targetId)
          ? prev
          : [...prev, { id: newId(), from: linking.fromId, to: targetId }],
      )
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [linking, blockById, say])

  const removeLink = (id: string) => setLinks((prev) => prev.filter((l) => l.id !== id))

  const linkTargetFor = (id: string): 'valid' | 'invalid' | null => {
    if (!linking || linking.targetId !== id) return null
    const from = blockById.get(linking.fromId)
    const to = blockById.get(id)
    return from && to && canLink(from.type, to.type) ? 'valid' : 'invalid'
  }

  /* ---------- pages ---------- */

  const addPage = () => {
    const name = window.prompt('Page name:', `Page ${pages.length + 1}`)?.trim()
    if (!name) return
    const id = newId()
    setPages((prev) => [...prev, { id, name }])
    setActivePageId(id)
  }

  const renamePage = (id: string) => {
    const page = pages.find((p) => p.id === id)
    const name = window.prompt('Rename page:', page?.name)?.trim()
    if (!name) return
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
  }

  const deletePage = (id: string) => {
    if (pages.length === 1) return
    const removedIds = new Set(blocks.filter((b) => b.pageId === id).map((b) => b.id))
    setBlocks((prev) => prev.filter((b) => b.pageId !== id))
    setLinks((prev) => prev.filter((l) => !removedIds.has(l.from) && !removedIds.has(l.to)))
    setPages((prev) => {
      const next = prev.filter((p) => p.id !== id)
      if (activePageId === id) setActivePageId(next[0].id)
      return next
    })
  }

  /* ---------- prompt ---------- */

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
    const autoLinks: Link[] = []
    for (let i = 0; i < types.length; i++) {
      for (let j = 0; j < types.length; j++) {
        if (
          i !== j &&
          canLink(types[i], types[j]) &&
          !autoLinks.some((l) => l.to === ids[j]) &&
          !autoLinks.some((l) => l.from === ids[j] && l.to === ids[i])
        ) {
          autoLinks.push({ id: newId(), from: ids[i], to: ids[j] })
          break
        }
      }
    }
    window.setTimeout(() => {
      setBlocks((prev) => prev.map((b) => (ids.includes(b.id) ? { ...b, building: false } : b)))
      setLinks((prev) => [...prev, ...autoLinks])
      const linkNote =
        autoLinks.length > 0
          ? ` I also linked ${autoLinks
              .map((l) => `${LABELS[types[ids.indexOf(l.from)]]} → ${LABELS[types[ids.indexOf(l.to)]]}`)
              .join(', ')} so data flows between them.`
          : ''
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingMsg.id
            ? {
                ...m,
                pending: false,
                text: `Added ${types.map((t) => LABELS[t]).join(', ')} to your board.${linkNote} Hit Compile & Run to use them.`,
              }
            : m,
        ),
      )
    }, 1500)
  }

  /* ---------- compile & run ---------- */

  const handleRun = () => {
    const result = compileTool(blocks, links, pages)
    if (!result.ok) {
      say(`Compile failed:\n${result.errors.map((e) => `• ${e}`).join('\n')}`)
      return
    }
    const notes =
      result.warnings.length > 0 ? ` Warnings:\n${result.warnings.map((w) => `• ${w}`).join('\n')}` : ''
    say(
      `Compiled ${blocks.length} block${blocks.length === 1 ? '' : 's'}, ${links.length} link${links.length === 1 ? '' : 's'}, ${pages.length} page${pages.length === 1 ? '' : 's'} — launching your tool.${notes}`,
    )
    setRunning(true)
  }

  /* ---------- save / import / export ---------- */

  const toSavedTool = (name: string): SavedTool => {
    const minX = Math.min(...blocks.map((b) => b.x))
    const minY = Math.min(...blocks.map((b) => b.y))
    const index = new Map(blocks.map((b, i) => [b.id, i]))
    const pageIndex = new Map(pages.map((p, i) => [p.id, i]))
    return {
      id: newId(),
      name,
      savedAt: new Date().toISOString(),
      blocks: blocks.map((b) => ({
        type: b.type,
        label: b.label,
        x: b.x - minX,
        y: b.y - minY,
        page: pageIndex.get(b.pageId) ?? 0,
        ...(b.role && b.role !== 'everyone' ? { role: b.role } : {}),
        ...(b.config ? { config: b.config } : {}),
      })),
      pages: pages.map((p) => p.name),
      pageRoles: pages.map((p) => p.role ?? 'everyone'),
      links: links
        .filter((l) => index.has(l.from) && index.has(l.to))
        .map((l) => ({ from: index.get(l.from)!, to: index.get(l.to)! })),
      backend,
      auth,
    }
  }

  const handleSaveTool = () => {
    if (blocks.length === 0) return
    const name = window.prompt('Name this tool:', toolName)?.trim()
    if (!name) return
    setToolName(name)
    setSavedTools((prev) => [toSavedTool(name), ...prev])
  }

  const handleImportTool = (tool: SavedTool) => {
    const multiPage = (tool.pages?.length ?? 1) > 1
    let pageIds: string[]
    if (multiPage) {
      const newPages = tool.pages!.map((name, i) => ({ id: newId(), name, role: tool.pageRoles?.[i] ?? 'everyone' }))
      setPages((prev) => [...prev, ...newPages])
      pageIds = newPages.map((p) => p.id)
      setActivePageId(newPages[0].id)
    } else {
      pageIds = [activePageId]
    }
    const offset = multiPage ? 0 : 40
    const newBlocks = tool.blocks.map((b) => ({
      id: newId(),
      type: b.type,
      label: b.label,
      x: b.x + offset,
      y: b.y + offset,
      pageId: pageIds[Math.min(b.page ?? 0, pageIds.length - 1)],
      role: b.role ?? 'everyone',
      config: b.config ?? defaultConfig(b.type),
    }))
    setBlocks((prev) => [...prev, ...newBlocks])
    if (tool.links) {
      setLinks((prev) => [
        ...prev,
        ...tool.links!.map((l) => ({ id: newId(), from: newBlocks[l.from].id, to: newBlocks[l.to].id })),
      ])
    }
    if (tool.backend) setBackend(tool.backend)
    if (tool.auth) setAuth(tool.auth)
    setToolName(tool.name)
  }

  const handleExportTool = (tool: SavedTool) => {
    const blob = new Blob([JSON.stringify(tool, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tool.name.toLowerCase().replace(/\s+/g, '-')}.toolboard.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteTool = (id: string) => {
    setSavedTools((prev) => prev.filter((t) => t.id !== id))
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const tool = parseSavedTool(String(reader.result))
      if (!tool) {
        window.alert('That file is not a valid Toolboard tool export.')
        return
      }
      setSavedTools((prev) => [{ ...tool, id: newId() }, ...prev])
      handleImportTool(tool)
    }
    reader.readAsText(file)
  }

  const handleClearPage = () => {
    const removedIds = new Set(pageBlocks.map((b) => b.id))
    setBlocks((prev) => prev.filter((b) => !removedIds.has(b.id)))
    setLinks((prev) => prev.filter((l) => !removedIds.has(l.from) && !removedIds.has(l.to)))
  }

  if (running) {
    return (
      <RunView
        toolName={toolName}
        blocks={blocks}
        links={links}
        pages={pages}
        backend={backend}
        auth={auth}
        onExit={() => setRunning(false)}
      />
    )
  }

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null

  const wirePath = (fx: number, fy: number, tx: number, ty: number) =>
    `M ${fx} ${fy} C ${fx + 60} ${fy}, ${tx - 60} ${ty}, ${tx} ${ty}`

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
            {blocks.length} block{blocks.length === 1 ? '' : 's'} · {links.length} link{links.length === 1 ? '' : 's'}
          </span>
          <button className="clear-btn" onClick={handleSaveTool} disabled={blocks.length === 0}>
            Save as tool
          </button>
          <button className="clear-btn" onClick={handleClearPage} disabled={pageBlocks.length === 0}>
            Clear page
          </button>
          <button className="clear-btn primary" onClick={handleRun} disabled={blocks.length === 0}>
            ▶ Compile &amp; Run
          </button>
        </div>
      </header>

      <div className="body">
        <aside className="palette">
          <section>
            <button
              type="button"
              className="section-toggle"
              onClick={() => toggleSection('sitemap')}
              aria-expanded={!collapsed.sitemap}
            >
              <span className={`chevron${collapsed.sitemap ? ' closed' : ''}`}>▾</span>
              <h2>Sitemap</h2>
              <span className="section-count">{pages.length}</span>
            </button>
            {!collapsed.sitemap && (
              <>
                {pages.map((page) => (
                  <div key={page.id} className={`page-item${page.id === activePageId ? ' active' : ''}`}>
                    <button className="page-select" onClick={() => setActivePageId(page.id)}>
                      <span className="page-name">{page.name}</span>
                      <span className="page-meta">
                        {blocks.filter((b) => b.pageId === page.id).length} block
                        {blocks.filter((b) => b.pageId === page.id).length === 1 ? '' : 's'}
                      </span>
                    </button>
                    <span className="tool-actions">
                      <button
                        className={`role-badge${(page.role ?? 'everyone') !== 'everyone' ? ' gated' : ''}`}
                        onClick={() => cyclePageRole(page.id)}
                        title={`Visible to: ${ROLE_LABELS[page.role ?? 'everyone']} — click to change`}
                        aria-label={`Change access for ${page.name} (currently ${ROLE_LABELS[page.role ?? 'everyone']})`}
                      >
                        {(page.role ?? 'everyone') === 'everyone' ? 'All' : page.role === 'ops' ? 'Ops' : 'Adm'}
                      </button>
                      <button onClick={() => renamePage(page.id)} title="Rename page" aria-label={`Rename ${page.name}`}>
                        ✎
                      </button>
                      {pages.length > 1 && (
                        <button onClick={() => deletePage(page.id)} title="Delete page" aria-label={`Delete ${page.name}`}>
                          ✕
                        </button>
                      )}
                    </span>
                  </div>
                ))}
                <button className="tool-file-import" onClick={addPage}>
                  + Add page
                </button>
              </>
            )}
          </section>

          <section>
            <button
              type="button"
              className="section-toggle"
              onClick={() => toggleSection('backend')}
              aria-expanded={!collapsed.backend}
            >
              <span className={`chevron${collapsed.backend ? ' closed' : ''}`}>▾</span>
              <h2>Backend</h2>
            </button>
            {!collapsed.backend && (
              <div className="backend-picker">
                <select
                  value={backend.kind}
                  onChange={(e) => setBackend((prev) => ({ ...prev, kind: e.target.value as BackendKind }))}
                  aria-label="Backend"
                >
                  {(Object.keys(BACKEND_LABELS) as BackendKind[]).map((kind) => (
                    <option key={kind} value={kind}>
                      {BACKEND_LABELS[kind]}
                    </option>
                  ))}
                </select>
                {isHttpBackend(backend.kind) && (
                  <input
                    className="backend-url"
                    value={backend.restUrl}
                    onChange={(e) => setBackend((prev) => ({ ...prev, restUrl: e.target.value }))}
                    placeholder={
                      backend.kind === 'aws'
                        ? 'https://abc123.execute-api.us-east-1.amazonaws.com/prod'
                        : backend.kind === 'azure'
                          ? 'https://my-tool.azurewebsites.net/api'
                          : 'https://api.example.com'
                    }
                  />
                )}
                <p className="backend-hint">{BACKEND_HINTS[backend.kind]}</p>
              </div>
            )}
          </section>

          <section>
            <button
              type="button"
              className="section-toggle"
              onClick={() => toggleSection('access')}
              aria-expanded={!collapsed.access}
            >
              <span className={`chevron${collapsed.access ? ' closed' : ''}`}>▾</span>
              <h2>Access</h2>
              {auth.required && <span className="section-count">on</span>}
            </button>
            {!collapsed.access && (
              <div className="access-picker">
                <label className="access-toggle-row">
                  <input
                    type="checkbox"
                    checked={auth.required}
                    onChange={(e) => setAuth({ required: e.target.checked })}
                  />
                  Require sign-in
                </label>
                {auth.required ? (
                  <>
                    <p className="backend-hint">
                      Demo users — gate pages in the Sitemap or blocks via the 🔒 badge:
                    </p>
                    <ul className="demo-users">
                      {DEMO_USERS.map((u) => (
                        <li key={u.username}>
                          <code>
                            {u.username} / {u.password}
                          </code>
                          <span>{ROLE_LABELS[u.role]}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="backend-hint">The compiled tool opens without a sign-in screen.</p>
                )}
              </div>
            )}
          </section>

          <section>
            <button
              type="button"
              className="section-toggle"
              onClick={() => toggleSection('tools')}
              aria-expanded={!collapsed.tools}
            >
              <span className={`chevron${collapsed.tools ? ' closed' : ''}`}>▾</span>
              <h2>My Tools</h2>
              <span className="section-count">{savedTools.length}</span>
            </button>
            {!collapsed.tools && (
              <>
                {savedTools.length === 0 && (
                  <p className="tools-empty">Build a board, then “Save as tool” to reuse it here.</p>
                )}
                {savedTools.map((tool) => (
                  <div key={tool.id} className="tool-item">
                    <button className="tool-import" onClick={() => handleImportTool(tool)} title="Import onto board">
                      <span className="tool-name">{tool.name}</span>
                      <span className="tool-meta">
                        {tool.blocks.length} block{tool.blocks.length === 1 ? '' : 's'}
                        {tool.links && tool.links.length > 0 ? ` · ${tool.links.length} links` : ''} · import →
                      </span>
                    </button>
                    <span className="tool-actions">
                      <button onClick={() => handleExportTool(tool)} title="Export as file" aria-label={`Export ${tool.name}`}>
                        ⤓
                      </button>
                      <button onClick={() => handleDeleteTool(tool.id)} title="Delete tool" aria-label={`Delete ${tool.name}`}>
                        ✕
                      </button>
                    </span>
                  </div>
                ))}
                <button className="tool-file-import" onClick={() => fileInputRef.current?.click()}>
                  Import from file…
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  hidden
                  onChange={handleImportFile}
                />
              </>
            )}
          </section>

          <p className="palette-hint">Drag onto the board · drag the ◉ port to link</p>
          {SECTIONS.map((section) => (
            <section key={section}>
              <button
                type="button"
                className="section-toggle"
                onClick={() => toggleSection(section)}
                aria-expanded={!collapsed[section]}
              >
                <span className={`chevron${collapsed[section] ? ' closed' : ''}`}>▾</span>
                <h2>{SECTION_TITLES[section]}</h2>
                <span className="section-count">
                  {PALETTE.filter((item) => item.section === section).length}
                </span>
              </button>
              {!collapsed[section] &&
                PALETTE.filter((item) => item.section === section).map((item) => (
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
          <svg className="wires" width="4000" height="4000">
            {pageLinks.map((link) => {
              const from = blockById.get(link.from)
              const to = blockById.get(link.to)
              if (!from || !to) return null
              const fx = from.x + BLOCK_W
              const fy = from.y + PORT_Y
              const tx = to.x
              const ty = to.y + PORT_Y
              return (
                <g key={link.id} className="wire">
                  <path className="wire-hit" d={wirePath(fx, fy, tx, ty)} />
                  <path className="wire-line" d={wirePath(fx, fy, tx, ty)} />
                  <g
                    className="wire-x"
                    transform={`translate(${(fx + tx) / 2}, ${(fy + ty) / 2})`}
                    onClick={() => removeLink(link.id)}
                  >
                    <circle r="9" />
                    <text textAnchor="middle" dominantBaseline="central">
                      ✕
                    </text>
                  </g>
                </g>
              )
            })}
            {linking &&
              (() => {
                const from = blockById.get(linking.fromId)
                if (!from) return null
                return (
                  <path
                    className="wire-line dragging"
                    d={wirePath(from.x + BLOCK_W, from.y + PORT_Y, linking.x, linking.y)}
                  />
                )
              })()}
          </svg>
          {pageBlocks.length === 0 && (
            <div className="empty-state">
              <p className="empty-title">Your whiteboard is empty</p>
              <p>Drag a feature from the left, or ask Devin on the right.</p>
              <p>Link blocks by dragging the ◉ port, then Compile &amp; Run.</p>
            </div>
          )}
          {pageBlocks.map((block) => (
            <BlockCard
              key={block.id}
              block={block}
              selected={selectedId === block.id}
              linkTarget={linkTargetFor(block.id)}
              onSelect={setSelectedId}
              onMove={handleMove}
              onDelete={handleDelete}
              onRename={handleRename}
              onCycleRole={handleCycleRole}
              onStartLink={handleStartLink}
            />
          ))}
        </main>

        <aside className="chat">
          {selectedBlock && (
            <Inspector block={selectedBlock} onChange={handleConfigChange} onClose={() => setSelectedId(null)} />
          )}
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
