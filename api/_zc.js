// 共享：ZooWork 客户端和 Node-style handler 小工具。Cloudflare Worker 通过 adapter 调用。
import { createZooclawClient, ZooclawError } from '@zooclaw-agents/sdk'

let client

// Worker 首次部署时 secret 可能尚未创建，因此不能在 module load 阶段读取 API key。
// Proxy 在第一次真正调用 SDK 方法时初始化 client；ZOOCLAW_API_KEY 仍只存在服务端。
export const zc = new Proxy({}, {
  get(_target, property) {
    client ??= createZooclawClient()
    const value = client[property]
    return typeof value === 'function' ? value.bind(client) : value
  },
})

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

/** 包装 handler：统一错误落地 */
export function route(fn) {
  return async (req, res) => {
    try { await fn(req, res) } catch (e) { send(res, e?.statusCode || 502, { error: errMsg(e) }) }
  }
}
