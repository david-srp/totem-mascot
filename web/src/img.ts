// 候选图取图。两套交付机制各缺一半（见 README「踩过的坑」）：
// webPath/path 指向沙箱路径，走 /api/logo-image 代理；artifact 有直连 URL，按 label 对上。
import type { Artifact, Candidate } from './types'

export type ArtifactsByLabel = Record<string, Artifact>

const proxied = (p: string) => '/api/logo-image?path=' + encodeURIComponent(p)

export function thumbOf(c: Candidate, byLabel: ArtifactsByLabel): string {
  const p = c.webPath || c.path || ''
  if (/^https?:/.test(p)) return p
  if (/^\/workspace\/logos\//.test(p)) return proxied(p)
  return byLabel[c.label]?.url || ''
}

export function fullOf(c: Candidate, byLabel: ArtifactsByLabel): string {
  return byLabel[c.label]?.url
    || (/^\/workspace\/logos\//.test(c.path || '') ? proxied(c.path!) : '')
}

/** 重画图排在原图后面：A1, A2, A2r, B1… */
export function displayOrder(items: Candidate[]): Candidate[] {
  const order: Candidate[] = []
  for (const c of items) if (!c.retryOf) { order.push(c); for (const r of items) if (r.retryOf === c.label) order.push(r) }
  for (const c of items) if (!order.includes(c)) order.push(c)
  return order
}
