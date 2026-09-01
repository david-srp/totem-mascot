import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as api from './api'
import { tr, useLang } from './i18n'
import { collect } from './parse'
import type { Artifact, Project, Turn } from './types'
import { Composer } from './components/Composer'
import { Lightbox } from './components/Lightbox'
import { NewProjectModal } from './components/NewProjectModal'
import { Panel } from './components/Panel'
import { Sidebar } from './components/Sidebar'
import { Talk } from './components/Talk'

const POLL_MS = 1800
const POLL_DEADLINE_MS = 18 * 60 * 1000 // 六张图 + 重画要十几分钟，超过这个就不等了

type PillState = { key: string; mode: '' | 'run' | 'ok' }

const SHOWCASE = ['A1', 'A1r', 'A2', 'A2r', 'B1', 'B1r', 'B2', 'B2r', 'C1', 'C1r', 'C2', 'C2r', 'owl']

function pickShowcase(count: number, avoid: string[] = []): string[] {
  const pool = SHOWCASE.filter((name) => !avoid.includes(name))
  const bag = (pool.length >= count ? pool : SHOWCASE).slice()
  const result: string[] = []
  while (result.length < count && bag.length) {
    result.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0])
  }
  return result
}

/** 空态素材随机取三张，每五秒错开换一轮；reduced-motion 下只随机一次。 */
function RotatingShowcase() {
  const [names, setNames] = useState(() => pickShowcase(3))
  const [swapping, setSwapping] = useState<Set<number>>(() => new Set())

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let current = names
    let next = pickShowcase(3, current)
    next.forEach((name) => { const image = new Image(); image.src = `/showcase/${name}.webp` })
    const timeouts: number[] = []

    const interval = window.setInterval(() => {
      if (document.hidden) return
      const incoming = next
      incoming.forEach((name, index) => {
        timeouts.push(window.setTimeout(() => {
          setSwapping((old) => new Set(old).add(index))
          timeouts.push(window.setTimeout(() => {
            setNames((old) => old.map((value, i) => i === index ? name : value))
            setSwapping((old) => { const copy = new Set(old); copy.delete(index); return copy })
          }, 340))
        }, index * 140))
      })
      current = incoming
      next = pickShowcase(3, current)
      next.forEach((name) => { const image = new Image(); image.src = `/showcase/${name}.webp` })
    }, 5000)

    return () => {
      clearInterval(interval)
      timeouts.forEach(clearTimeout)
    }
  }, []) // 首轮 names 只用于初始化这个定时器

  return (
    <div className="art" data-rotate>
      {names.map((name, index) => (
        <img
          key={index}
          className={swapping.has(index) ? 'swapping' : ''}
          src={`/showcase/${name}.webp`}
          alt=""
          width={88}
          height={88}
        />
      ))}
    </div>
  )
}

export default function App() {
  const lang = useLang() // 语言切换时整棵树重渲染，所有 tr() 都会取到新文案

  const [projects, setProjects] = useState<Project[]>([])
  const [pid, setPid] = useState<string | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [busy, setBusy] = useState(false)
  const [pill, setPill] = useState<PillState>({ key: 'ready', mode: 'ok' })
  const [byLabel, setByLabel] = useState<Record<string, Artifact>>({})
  const [byFile, setByFile] = useState<Record<string, Artifact>>({})
  const [openErr, setOpenErr] = useState('')

  const [drawerOpen, setDrawerOpen] = useState(false)   // 移动端左侧项目抽屉
  const [panelOpen, setPanelOpen] = useState(false)     // 右侧成品抽屉
  const [panelFresh, setPanelFresh] = useState(false)   // 有新成品、还没打开过抽屉
  const [modalOpen, setModalOpen] = useState(false)
  const [zoomSrc, setZoomSrc] = useState<string | null>(null)

  // 轮询回调里要读到最新值，走 ref；state 版本只管渲染
  const pidRef = useRef<string | null>(null)
  const lastSeqRef = useRef(-1)
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const panelOpenRef = useRef(false)
  panelOpenRef.current = panelOpen
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { document.title = tr('t.app') }, [lang])

  const stopPoll = () => { if (pollerRef.current) { clearInterval(pollerRef.current); pollerRef.current = null } }
  useEffect(() => stopPoll, [])

  const loadProjects = useCallback(async () => {
    try { setProjects(await api.listProjects()) } catch { /* 侧栏刷新失败不打断当前对话 */ }
  }, [])

  const loadArtifacts = useCallback(async (id: string) => {
    try {
      const rows = await api.fetchArtifacts(id)
      const label: Record<string, Artifact> = {}
      const file: Record<string, Artifact> = {}
      for (const a of rows) { label[a.label] = a; file[a.fileName] = a }
      setByLabel(label); setByFile(file)
    } catch { /* 图暂时取不到，下一次 done 时还会再拉 */ }
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  const poll = useCallback(() => {
    stopPoll()
    const deadline = Date.now() + POLL_DEADLINE_MS
    pollerRef.current = setInterval(async () => {
      const id = pidRef.current
      if (!id) return
      try {
        const d = await api.pollEvents(id, lastSeqRef.current)
        if (typeof d.lastSeq === 'number') lastSeqRef.current = d.lastSeq
        if (d.events.length) {
          setTurns((prev) => {
            if (!prev.length) return prev
            const cur = { ...prev[prev.length - 1], tools: [...prev[prev.length - 1].tools], media: [...prev[prev.length - 1].media] }
            for (const ev of d.events) {
              if (ev.kind === 'user') continue
              if (ev.kind === 'media') { cur.media.push({ fileName: ev.fileName, mimeType: ev.mimeType, size: ev.size }); continue }
              if (ev.kind === 'text') cur.reply += ev.text
              else if (ev.kind === 'tool') cur.tools.push({ name: ev.name, args: ev.args })
              else if (ev.kind === 'error') cur.reply += '\n\n' + tr('errPrefix') + ev.message
            }
            return [...prev.slice(0, -1), cur]
          })
        }
        if (d.done) {
          stopPoll()
          setBusy(false)
          setPill({ key: 'done', mode: 'ok' })
          await loadArtifacts(id)
          loadProjects()
          if (!panelOpenRef.current) setPanelFresh(true)
        } else if (Date.now() > deadline) {
          stopPoll()
          setBusy(false)
          setPill({ key: 'slow', mode: '' })
        }
      } catch { /* 单次轮询失败无所谓，下一个 tick 再试 */ }
    }, POLL_MS)
  }, [loadArtifacts, loadProjects])

  const openProject = useCallback(async (id: string) => {
    stopPoll()
    pidRef.current = id
    lastSeqRef.current = -1
    setPid(id); setBusy(false); setTurns([]); setByLabel({}); setByFile({})
    setOpenErr(''); setDrawerOpen(false); setPanelOpen(false); setPanelFresh(false)
    setPill({ key: 'loading', mode: 'run' })
    try {
      const [h] = await Promise.all([api.fetchHistory(id), loadArtifacts(id)])
      setTurns(h.turns)
      lastSeqRef.current = h.lastSeq ?? -1
      if (h.running) { setBusy(true); poll(); setPill({ key: 'drawing', mode: 'run' }) }
      else setPill({ key: 'ready', mode: 'ok' })
    } catch (e) {
      setPill({ key: 'failopen', mode: '' })
      setOpenErr(e instanceof Error ? e.message : String(e))
    }
    scrollRef.current?.scrollTo({ top: 0 })
  }, [loadArtifacts, poll])

  const send = useCallback(async (text: string) => {
    const id = pidRef.current
    if (busy || !text.trim() || !id) return
    setBusy(true)
    setTurns((prev) => [...prev, { role: 'user', text, reply: '', tools: [], media: [], from: new Date().toISOString(), to: null, outcome: null }])
    setPill({ key: 'drawing', mode: 'run' })
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }))
    try {
      await api.postMessage(id, text)
      poll()
    } catch (e) {
      setBusy(false)
      setPill({ key: 'failsend', mode: '' })
      const msg = tr('failsend') + '：' + (e instanceof Error ? e.message : String(e))
      setTurns((prev) => [...prev.slice(0, -1), { ...prev[prev.length - 1], reply: msg }])
    }
  }, [busy, poll])

  const createProject = useCallback(async (title: string, brief: string) => {
    const d = await api.createProject(title, brief || undefined)
    setModalOpen(false)
    await loadProjects()
    await openProject(d.id)
    // 展示服务端实际发出去的那段开场，和历史保持一致
    setTurns([{ role: 'user', text: d.opener || brief, reply: '', tools: [], media: [], from: new Date().toISOString(), to: null, outcome: null }])
    setBusy(true)
    setPill({ key: 'drawing', mode: 'run' })
    poll()
  }, [loadProjects, openProject, poll])

  const removeProject = useCallback(async (id: string) => {
    if (!confirm(tr('removeQ'))) return
    try { await api.deleteProject(id) } catch { /* 归档失败就先留着，刷新后还在 */ }
    if (pidRef.current === id) {
      stopPoll()
      pidRef.current = null
      setPid(null); setTurns([]); setBusy(false)
    }
    loadProjects()
  }, [loadProjects])

  // Escape：先关大图，再关弹窗和抽屉
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setZoomSrc((z) => {
        if (z) return null
        setModalOpen(false); setDrawerOpen(false); setPanelOpen(false)
        return z
      })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const { dirs, cands: rawCands } = useMemo(() => collect(turns), [turns])
  // 没有结构化清单时（非 ip-as-logo 的 agent），直接用本会话的图片 artifact 兜底
  const cands = useMemo(() => {
    if (rawCands?.length) return rawCands
    const imgs = Object.values(byFile).filter((a) => a.isImage && a.url)
      .sort((a, b) => String(a.fileName).localeCompare(String(b.fileName), undefined, { numeric: true }))
    return imgs.length ? imgs.map((a) => ({ label: a.label, subject: a.label, webPath: a.url, path: '' })) : null
  }, [rawCands, byFile])

  const quick = useMemo(() => {
    const q: string[] = []
    if (dirs?.length && !cands) q.push(tr('q1'))
    if (cands) { q.push(tr('q2')); q.push(tr('q3')) }
    if (!dirs?.length && !cands) q.push(tr('q4'))
    return q
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirs, cands, lang])

  const worksN = cands?.length || 0
  const showOpenP = worksN > 0 || !!dirs?.length
  const project = projects.find((p) => p.id === pid)

  const openPanel = () => { setPanelOpen(true); setPanelFresh(false) }

  return (
    <>
      <Sidebar
        projects={projects} pid={pid} open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNew={() => setModalOpen(true)}
        onOpen={openProject}
        onDelete={removeProject}
      />

      <main className="main">
        {!pid ? (
          <div className="blank">
            <div className="mtop">
              <button className="burger" aria-label={tr('a.mine')} onClick={() => setDrawerOpen(true)}>
                <b></b>
                {projects.length > 0 && <em>{projects.length}</em>}
              </button>
              <a className="brand" href="/">
                <img className="mk" src="/brandmark.webp" alt="" width={96} height={96} />
                <span>{tr('brand')}</span>
              </a>
            </div>
            <div className="in">
              <RotatingShowcase />
              <h2>{tr('a.blankh')}</h2>
              <p>{tr('a.blankp')}</p>
              <button className="btn lg" onClick={() => setModalOpen(true)}>{tr('a.new')}</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div className="bar">
              <button className="burger" aria-label={tr('a.mine')} onClick={() => setDrawerOpen(true)}><b></b></button>
              <h1 style={{ flex: 1, minWidth: 0 }}>{project?.title || tr('proj')}</h1>
              {showOpenP && (
                <button className={'openp' + (panelFresh ? ' fresh' : '')} onClick={openPanel}>
                  <span>{tr('a.works')}</span> <em>{worksN || ''}</em>
                </button>
              )}
              <span className={'pill' + (pill.mode ? ' ' + pill.mode : '')}>
                <i></i><span>{tr(pill.key)}</span>
              </span>
            </div>

            <div className="scroll" ref={scrollRef}>
              <div className="inner">
                {openErr
                  ? <div className="rep"><div className="body" style={{ color: 'var(--accent)' }}>{openErr}</div></div>
                  : <Talk turns={turns} busy={busy} byLabel={byLabel} byFile={byFile} onZoom={setZoomSrc} onOpenPanel={openPanel} />}
              </div>
            </div>

            <Composer busy={busy} quick={quick} onSend={send} />
          </div>
        )}
      </main>

      <NewProjectModal open={modalOpen} onCancel={() => setModalOpen(false)} onCreate={createProject} />
      <Panel open={panelOpen} dirs={dirs} cands={cands} byLabel={byLabel} onClose={() => setPanelOpen(false)} onZoom={setZoomSrc} />
      <Lightbox src={zoomSrc} onClose={() => setZoomSrc(null)} />
    </>
  )
}
