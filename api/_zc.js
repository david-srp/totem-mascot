// 共享：客户端 + 小工具。下划线开头，Vercel 不当作路由。
import { createZooclawClient, ZooclawError } from '@zooclaw-agents/sdk'

export const zc = createZooclawClient() // ZOOCLAW_API_KEY 只在服务端
export const AGENT_ID = process.env.IP_AGENT_ID

export async function readJson(req) {
  const chunks = []
  for await (const c of req) chunks.push(c)
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
}

export function send(res, code, obj) {
  res.statusCode = code
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(obj))
}

export function errMsg(e) {
  return e instanceof ZooclawError ? `${e.status} ${e.type}: ${e.message}` : String(e?.message ?? e)
}

/** 包装 handler：统一 AGENT_ID 校验与错误落地 */
export function route(fn) {
  return async (req, res) => {
    if (!AGENT_ID) return send(res, 500, { error: 'IP_AGENT_ID 未配置' })
    try { await fn(req, res) } catch (e) { send(res, 502, { error: errMsg(e) }) }
  }
}
