// 前后端接口契约。api/ 返回的形状变了，先改这里，编译器会把要跟着改的地方都指出来。

export interface Project {
  id: string
  title: string
  brief: string
  updatedAt: string | null
  runStatus?: string | null
}

export interface ToolCallInfo {
  name: string
  args?: unknown
}

export interface MediaRef {
  fileName: string
  mimeType?: string
  size?: number
}

/** 一轮对话：用户说的话 + agent 的完整回复（含工具调用与交付的文件） */
export interface Turn {
  role: 'user'
  text: string
  reply: string
  tools: ToolCallInfo[]
  media: MediaRef[]
  from: string | null
  to: string | null
  outcome: unknown
}

/** /api/artifacts 的一行：agent 用 artifact_publish 发布的文件，带可直接访问的 URL */
export interface Artifact {
  id: string
  label: string
  fileName: string
  url: string
  size?: number
  contentType?: string
  isImage: boolean
  sourcePath?: string
  createdAt?: string
}

/** ipal-manifest 里 phase=directions 的一项 */
export interface Direction {
  key?: string
  subject: string
  connection: string
  silhouette: string
}

/** ipal-manifest 里 phase=candidates 的一项；scavenge 出来的兜底项只有部分字段 */
export interface Candidate {
  label: string
  direction?: string
  subject?: string
  retryOf?: string
  path?: string
  webPath?: string
  artifactId?: string
  background?: string
  ipColors?: string[]
  opaque?: boolean
  verdict?: 'recommended' | 'not-recommended' | string
  notes?: string
}

export interface Manifest {
  phase: 'directions' | 'candidates' | string
  items?: Array<Direction & Candidate>
}

/** GET /api/logo 增量事件（已由服务端从 ZooWork 原始事件翻译成这几种） */
export type ApiEvent =
  | { kind: 'user'; seq: number; text: string }
  | { kind: 'media'; seq: number; fileName: string; mimeType: string; size: number }
  | { kind: 'text'; seq: number; text: string }
  | { kind: 'tool'; seq: number; name: string; args?: unknown }
  | { kind: 'error'; seq: number; message: string }

export interface LogoPollResponse {
  events: ApiEvent[]
  lastSeq: number
  done: boolean
  outcome: unknown
}

export interface HistoryResponse {
  turns: Turn[]
  lastSeq: number
  running: boolean
  eventCount: number
}
