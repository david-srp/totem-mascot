// 从 agent 回复里解析结构化信息：ipal-manifest 代码块是正路，
// scavenge 系列是没有 manifest 时的兜底（非 ip-as-logo 的 agent、或 manifest 漏发）。
import { IMG_URL } from './markdown'
import type { Artifact, Candidate, Direction, Manifest, ToolCallInfo, Turn } from './types'

export const KEY = ['A', 'B', 'C', 'D', 'E', 'F']

export function manifests(t: string | undefined): Manifest[] {
  const out: Manifest[] = []
  const re = /```ipal-manifest\s*([\s\S]*?)```/g
  let m: RegExpExecArray | null
  while ((m = re.exec(t || ''))) {
    try { out.push(JSON.parse(m[1].trim())) } catch { /* 半截 JSON（还在流式输出中）先跳过 */ }
  }
  return out
}

/** 正文里按「主体 — 关联 — 剪影」行格式抠出三个方向 */
export function scavDirs(t: string | undefined): Direction[] {
  const items: Direction[] = []
  const D = /\s+[—–]\s+|\s+--\s+/
  for (const ln of String(t || '').split('\n')) {
    let s = ln.trim()
    if (!s || s.length > 220) continue
    const km = s.match(/^(?:[-*]\s*)?(?:\*\*)?\s*([A-C]|[1-3])[.、)]\s*/)
    const k = km ? km[1] : null
    if (km) s = s.slice(km[0].length)
    s = s.replace(/\*\*/g, '').trim()
    const p = s.split(D).map((x) => x.trim()).filter(Boolean)
    if (p.length < 3 || p[0].length > 40) continue
    items.push({
      key: k && /[1-3]/.test(k) ? 'ABC'[+k - 1] : (k || KEY[items.length]),
      subject: p[0], connection: p[1], silhouette: p.slice(2).join('，'),
    })
    if (items.length === 3) break
  }
  return items.length === 3 ? items : []
}

/** 正文里出现的 /workspace/logos/ 路径当候选图兜底 */
export function scavCands(t: string | undefined): Candidate[] {
  const items: Candidate[] = []
  const seen = new Set<string>()
  const re = /(\/workspace\/logos\/[A-Za-z0-9._-]+\/([A-Za-z0-9._-]+)\.(?:png|jpg|jpeg|webp))/g
  let m: RegExpExecArray | null
  while ((m = re.exec(t || ''))) {
    const l = m[2].replace(/\.web$/, '')
    if (seen.has(l)) continue
    seen.add(l)
    items.push({ label: l, path: m[1], direction: l[0] })
  }
  return items
}

/** 有些 agent 只会把图片链接直接贴在正文里，也要能显示 */
export function urlsIn(text: string | undefined): Array<{ url: string; fileName: string }> {
  const out: Array<{ url: string; fileName: string }> = []
  const seen = new Set<string>()
  for (const m of String(text || '').matchAll(IMG_URL)) {
    const url = m[0]
    if (seen.has(url)) continue
    seen.add(url)
    out.push({ url, fileName: decodeURIComponent(url.split('/').pop()!.split('?')[0]) })
  }
  return out
}

/** 一轮里所有能显示的图。
    attachment.created 事件带文件名和轮次但【没有 url】，url 要按文件名去 artifacts 里查；
    正文里的裸链接作为兜底。两边按文件名去重。 */
export function mediaOfTurn(turn: Turn, byFile: Record<string, Artifact>): Array<{ url: string; fileName: string }> {
  const out: Array<{ url: string; fileName: string }> = []
  const seen = new Set<string>()
  for (const m of turn.media || []) {
    const isImg = /^image\//.test(m.mimeType || '') || /\.(png|jpe?g|webp|gif|avif)$/i.test(m.fileName || '')
    if (!isImg || seen.has(m.fileName)) continue
    const a = byFile[m.fileName]
    if (!a || !a.url) continue
    seen.add(m.fileName)
    out.push({ url: a.url, fileName: m.fileName })
  }
  for (const u of urlsIn(turn.reply)) {
    if (seen.has(u.fileName)) continue
    seen.add(u.fileName)
    out.push(u)
  }
  // 兜底：只调 artifact_publish 的 agent 不产生 attachment 事件，没法知道图属于哪一轮，
  // 按产出时间落在这一轮的时间窗内来归属。
  if (!out.length && turn.from) {
    const a = +new Date(turn.from)
    const b = turn.to ? +new Date(turn.to) + 60000 : Date.now()
    for (const art of Object.values(byFile)) {
      if (!art.isImage || !art.url || !art.createdAt) continue
      const t = +new Date(art.createdAt)
      if (t >= a && t <= b && !seen.has(art.fileName)) { seen.add(art.fileName); out.push({ url: art.url, fileName: art.fileName }) }
    }
    out.sort((x, y) => String(x.fileName).localeCompare(String(y.fileName), undefined, { numeric: true }))
  }
  return out
}

/** 单轮的候选图：预览条要挂在真正交付的那一轮下面，而不是整段对话 */
export function candsOfTurn(t: Turn): Candidate[] | null {
  for (const m of manifests(t.reply)) if (m.phase === 'candidates' && m.items?.length) return m.items as Candidate[]
  const c = scavCands(t.reply)
  return c.length ? c : null
}

/** 全对话汇总：最新的方向清单 + 最新的候选图清单 */
export function collect(turns: Turn[]): { dirs: Direction[] | null; cands: Candidate[] | null } {
  let dirs: Direction[] | null = null
  let cands: Candidate[] | null = null
  for (const t of turns) {
    for (const m of manifests(t.reply)) {
      if (m.phase === 'directions' && m.items?.length) dirs = m.items as Direction[]
      if (m.phase === 'candidates' && m.items?.length) cands = m.items as Candidate[]
    }
    if (!dirs) { const d = scavDirs(t.reply); if (d.length) dirs = d }
    if (!cands) { const c = scavCands(t.reply); if (c.length) cands = c }
  }
  return { dirs, cands }
}

/** 把工具调用翻译成进度文案的键，不暴露任何内部名词 */
export function phaseOf(tools: ToolCallInfo[]): { key: string; n?: number } {
  const names = tools.map((t) => t.name + ' ' + JSON.stringify(t.args || {}))
  const gen = names.filter((n) => /image_generation_cli/.test(n)).length
  const look = tools.filter((t) => t.name === 'image').length
  const pub = tools.filter((t) => t.name === 'artifact_publish').length
  if (pub) return { key: 'pTidy' }
  if (look) return { key: 'pCheck', n: look }
  if (gen) return { key: 'pDraw', n: gen }
  if (names.length) return { key: 'pThink' }
  return { key: 'pIdle' }
}
