// agent 用 artifact_publish 发布的原图：直接给浏览器可取的 URL，原分辨率、无大小上限。
import { zc, send, route } from './_zc.js'
import { findAgent } from './_agent.js'
import { identityOf } from './_identity.js'

export const config = { maxDuration: 30 }

export default route(async (req, res) => {
  const identity = await identityOf(req)
  const sid = new URL(req.url, 'http://x').searchParams.get('session')
  if (!sid) return send(res, 400, { error: 'session required' })
  const agentId = await findAgent(identity)
  if (!agentId) return send(res, 200, { artifacts: [] })

  const rows = []
  for (let page = 1; page <= 4; page++) {
    const p = await zc.listArtifacts(agentId, { sessionId: sid, page, limit: 100 })
    rows.push(...(p.artifacts ?? []))
    if (!p.has_more) break
  }

  // 同名多版本只留最新一条
  const byName = new Map()
  for (const a of rows) {
    if (a.status !== 'ready' || !a.url) continue
    const prev = byName.get(a.file_name)
    if (!prev || new Date(a.created_at) > new Date(prev.created_at)) byName.set(a.file_name, a)
  }

  send(res, 200, {
    artifacts: [...byName.values()].map((a) => ({
      id: a.artifact_id,
      // 标签就是文件名去掉扩展名：A1.png -> A1
      label: String(a.file_name || '').replace(/\.[^.]+$/, ''),
      fileName: a.file_name,
      url: a.url,
      size: a.size,
      contentType: a.content_type,
      isImage: /^image\//.test(a.content_type || '') || /\.(png|jpe?g|webp|gif|avif)$/i.test(a.file_name || ''),
      sourcePath: a.source_path,
      createdAt: a.created_at,
    })),
  })
})
