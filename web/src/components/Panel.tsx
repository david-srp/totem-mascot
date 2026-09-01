// 右侧成品抽屉：三个方向 / 32px 预览 / 全部图。
import { tr } from '../i18n'
import { displayOrder, fullOf, thumbOf, type ArtifactsByLabel } from '../img'
import { KEY } from '../parse'
import type { Candidate, Direction } from '../types'

interface Props {
  open: boolean
  dirs: Direction[] | null
  cands: Candidate[] | null
  byLabel: ArtifactsByLabel
  onClose: () => void
  onZoom: (src: string) => void
}

export function Panel({ open, dirs, cands, byLabel, onClose, onZoom }: Props) {
  const order = cands?.length ? displayOrder(cands) : []
  const withThumb = order.filter((c) => thumbOf(c, byLabel))
  const n = cands?.length || 0
  return (
    <>
      <div className={'pscrim' + (open ? ' on' : '')} onClick={onClose} />
      <aside className={'panel' + (open ? ' on' : '')}>
        <div className="phead">
          <h2>{tr('a.works')}</h2>
          <span className="cnt">{n ? tr('count', { n }) : ''}</span>
          <button className="pclose" aria-label="收起" onClick={onClose}>×</button>
        </div>
        <div className="pbody">
          {!!dirs?.length && (
            <div className="blk">
              <h2>{tr('a.dirs')}</h2>
              <div className="dirs">
                {dirs.map((d, i) => (
                  <div className="dir" key={d.key || i}>
                    <div className="k">{d.key || KEY[i]}</div>
                    <h3>{d.subject}</h3>
                    <p>{d.connection}</p>
                    <p>{d.silhouette}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {withThumb.length > 0 && (
            <div className="blk">
              <div className="mini">
                <span className="lb">{tr('a.mini')}</span>
                <div className="row">
                  {withThumb.map((c) => (
                    <img key={c.label} src={thumbOf(c, byLabel)} alt={c.subject || c.label} title={c.subject || c.label} />
                  ))}
                </div>
              </div>
            </div>
          )}
          {order.length > 0 && (
            <div className="blk">
              <h2>{tr('a.all')}</h2>
              <div className="grid">
                {order.map((c) => <CandidateCard key={c.label} c={c} byLabel={byLabel} onZoom={onZoom} />)}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

function CandidateCard({ c, byLabel, onZoom }: { c: Candidate; byLabel: ArtifactsByLabel; onZoom: (src: string) => void }) {
  const th = thumbOf(c, byLabel)
  const full = fullOf(c, byLabel)
  const cols = [c.background, ...(c.ipColors || [])].filter(Boolean) as string[]
  const redo = !!c.retryOf
  const good = c.verdict === 'recommended'
  // 徽章说结论，重画身份放标题旁，两个信息不互相顶掉
  return (
    <div className="item">
      <figure>
        <div className="thumb" onClick={() => { const src = full || th; if (src) onZoom(src) }}>
          {good && <span className="chip good">{tr('recommend')}</span>}
          {!good && c.verdict && <span className="chip">{redo ? tr('nearly') : tr('redone')}</span>}
          {th
            ? <img src={th} alt={c.subject || c.label} loading="lazy" />
            : <div className="wait">{tr('drawingShort')}</div>}
        </div>
        <figcaption>
          <div className="cap">
            <b>{c.subject || c.label}</b>
            {redo && <span className="redolbl">{tr('redoV')}</span>}
            {cols.length > 0 && (
              <span className="sw">{cols.map((h, i) => <i key={i} style={{ background: h }} />)}</span>
            )}
          </div>
          {c.notes && <div className="note">{c.notes}</div>}
          {full && (
            <a className="dl" href={full} download target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              {tr('download')}
            </a>
          )}
        </figcaption>
      </figure>
    </div>
  )
}
