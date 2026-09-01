// 对话区：用户气泡 + agent 回复（markdown）+ 该轮交付的小图预览条 + 进度胶囊。
import type { ReactNode } from 'react'
import { tr } from '../i18n'
import { fullOf, thumbOf, type ArtifactsByLabel } from '../img'
import { md } from '../markdown'
import { candsOfTurn, mediaOfTurn, phaseOf, urlsIn } from '../parse'
import type { Artifact, Turn } from '../types'

interface Props {
  turns: Turn[]
  busy: boolean
  byLabel: ArtifactsByLabel
  byFile: Record<string, Artifact>
  onZoom: (src: string) => void
  onOpenPanel: () => void
}

export function Talk({ turns, busy, byLabel, byFile, onZoom, onOpenPanel }: Props) {
  return (
    <div className="talk">
      {turns.map((turn, i) => (
        <TurnView
          key={i}
          turn={turn}
          isLast={i === turns.length - 1}
          busy={busy}
          byLabel={byLabel}
          byFile={byFile}
          onZoom={onZoom}
          onOpenPanel={onOpenPanel}
        />
      ))}
    </div>
  )
}

interface TurnProps {
  turn: Turn
  isLast: boolean
  busy: boolean
  byLabel: ArtifactsByLabel
  byFile: Record<string, Artifact>
  onZoom: (src: string) => void
  onOpenPanel: () => void
}

function TurnView({ turn, isLast, busy, byLabel, byFile, onZoom, onOpenPanel }: TurnProps) {
  const cs = candsOfTurn(turn)
  const drop = new Set<string>()
  const inlineImgs = urlsIn(turn.reply) // 正文里 agent 贴的图片链接

  let strip: ReactNode = null
  if (cs && cs.length) {
    // ip-as-logo 这类有结构化清单的，保留原来的富信息渲染
    const shown = cs.filter((c) => thumbOf(c, byLabel)).slice(0, 8)
    const labels = new Set(cs.map((c) => String(c.label || '').toLowerCase()))
    const extra: Array<{ url: string; fileName: string }> = []
    for (const u of inlineImgs) {
      drop.add(u.url) // 清单已经把图显示出来了，正文里的链接一律收掉
      const base = u.fileName.replace(/\.[^.]+$/, '').toLowerCase()
      if (!labels.has(base)) extra.push(u) // 清单没覆盖的，补一张进去
    }
    const cells = [
      ...shown.map((c) => ({ src: thumbOf(c, byLabel), big: fullOf(c, byLabel) || thumbOf(c, byLabel), name: c.subject || c.label })),
      ...extra.map((u) => ({ src: u.url, big: u.url, name: u.fileName })),
    ]
    if (cells.length) strip = (
      <div className="strip">
        <div className="row">
          {cells.map((c, i) => (
            <img key={i} src={c.src} alt={c.name} title={c.name} loading="lazy" onClick={() => onZoom(c.big)} />
          ))}
        </div>
        <button className="more" onClick={onOpenPanel}>{tr('viewAll', { n: cs.length })}</button>
      </div>
    )
  } else {
    // 其他 agent：通用图片通路
    const ms = mediaOfTurn(turn, byFile)
    if (ms.length) {
      ms.forEach((m) => drop.add(m.url))
      strip = (
        <div className="strip">
          <div className="row">
            {ms.map((m) => (
              <img key={m.url} src={m.url} alt={m.fileName} title={m.fileName} loading="lazy" onClick={() => onZoom(m.url)} />
            ))}
          </div>
        </div>
      )
    }
  }

  const body = md(turn.reply, drop)
  const phase = phaseOf(turn.tools)
  return (
    <>
      <div className="said">{turn.text}</div>
      {body.trim() && (
        <div className="rep">
          {/* body 由 md() 生成，内部所有原始文本都先过了 esc()，见 markdown.ts */}
          <div className="body" dangerouslySetInnerHTML={{ __html: body }} />
        </div>
      )}
      {strip && <div className="rep">{strip}</div>}
      {isLast && busy && (
        <div className="rep">
          <span className="prog">
            <span className="sp" />
            {tr(phase.key, phase.n != null ? { n: phase.n } : undefined)}
          </span>
        </div>
      )}
    </>
  )
}
