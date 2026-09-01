// /api 的薄封装。所有响应都是 JSON；非 2xx 时服务端会带 { error }。
// 身份由 Cloudflare Access 的 httpOnly cookie 提供，前端不保存 user id。
import { tr } from './i18n'
import type { Artifact, HistoryResponse, LogoPollResponse, Project } from './types'

async function api<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...opts, headers: { ...opts?.headers } })
  const text = await r.text()
  let data: unknown
  try { data = JSON.parse(text) } catch { throw new Error(tr('netbad')) }
  if (!r.ok) throw new Error((data as { error?: string }).error || tr('oops'))
  return data as T
}

const post = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

export const listProjects = () =>
  api<{ projects: Project[] }>('/api/projects').then((d) => d.projects)

export const createProject = (title: string, message?: string) =>
  api<{ id: string; opener: string }>('/api/projects', post({ title, message }))

export const deleteProject = (id: string) =>
  api<{ archived: boolean }>('/api/projects?session=' + encodeURIComponent(id), { method: 'DELETE' })

export const fetchHistory = (id: string) =>
  api<HistoryResponse>('/api/history?session=' + encodeURIComponent(id))

export const fetchArtifacts = (id: string) =>
  api<{ artifacts: Artifact[] }>('/api/artifacts?session=' + encodeURIComponent(id)).then((d) => d.artifacts)

export const postMessage = (sessionId: string, message: string) =>
  api<{ sessionId: string }>('/api/logo', post({ sessionId, message }))

export const pollEvents = (sessionId: string, afterSeq: number) =>
  api<LogoPollResponse>('/api/logo?session=' + encodeURIComponent(sessionId) + '&afterSeq=' + afterSeq)
