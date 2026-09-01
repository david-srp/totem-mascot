import { tr } from '../i18n'
import type { Project } from '../types'
import { Controls } from './Controls'

/** 更新时间显示成「x 分钟前」这类相对时间 */
function ago(iso: string | null): string {
  if (!iso) return ''
  const d = (Date.now() - +new Date(iso)) / 1000
  return d < 60 ? tr('justNow')
    : d < 3600 ? tr('minAgo', { n: Math.floor(d / 60) })
    : d < 86400 ? tr('hrAgo', { n: Math.floor(d / 3600) })
    : tr('dayAgo', { n: Math.floor(d / 86400) })
}

interface Props {
  projects: Project[]
  pid: string | null
  open: boolean
  onClose: () => void
  onNew: () => void
  onOpen: (id: string) => void
  onDelete: (id: string) => void
}

export function Sidebar({ projects, pid, open, onClose, onNew, onOpen, onDelete }: Props) {
  return (
    <>
      <div className={'scrim' + (open ? ' on' : '')} onClick={onClose} />
      <aside className={'side' + (open ? ' open' : '')}>
        <div className="top">
          <a className="brand" href="/">
            <img className="mk" src="/brandmark.webp" alt="" width={96} height={96} />
            <span>{tr('brand')}</span>
          </a>
          <button className="btn newbtn" onClick={onNew}>{tr('a.new')}</button>
        </div>
        <div className="plist">
          <div className="hd">{tr('a.mine')}</div>
          <div>
            {projects.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--ink-3)', padding: '6px 8px' }}>{tr('noProj')}</div>
            )}
            {projects.map((p) => (
              <button key={p.id} className={'pitem' + (p.id === pid ? ' on' : '')} onClick={() => { if (p.id !== pid) onOpen(p.id) }}>
                <div className="t">
                  <span className="nm">{p.title}</span>
                  <span
                    className="x"
                    role="button"
                    tabIndex={0}
                    aria-label={tr('remove')}
                    title={tr('remove')}
                    onClick={(e) => { e.stopPropagation(); onDelete(p.id) }}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return
                      e.preventDefault()
                      e.stopPropagation()
                      onDelete(p.id)
                    }}
                  >✕</span>
                </div>
                <div className="m">{ago(p.updatedAt)}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="foot">
          <Controls />
          <div className="links">
            <a href="/">{tr('a.home')}</a> · <a href="/guide">{tr('a.guide')}</a>
          </div>
        </div>
      </aside>
    </>
  )
}
