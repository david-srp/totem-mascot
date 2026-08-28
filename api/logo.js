// POST /api/logo            投递一轮消息，立刻返回（六张图要几分钟，不能长连接）
// GET  /api/logo?session=…  按游标拉增量事件，客户端轮询
import { assistantText, toolCall, isRunFinished, runOutcome } from '@zooclaw-agents/sdk'
import { zc, AGENT_ID, readJson, send, route } from './_zc.js'
import { eventsAfter, userText } from './_events.js'

export const config = { maxDuration: 60 }

export default route(async (req, res) => {
  if (req.method === 'POST') {
    const { sessionId, message } = await readJson(req)
    if (!message || typeof message !== 'string') return send(res, 400, { error: 'message required' })
    if (!sessionId) return send(res, 400, { error: 'sessionId required — 先建项目' })
    await zc.postEvents(AGENT_ID, sessionId, [
      { type: 'user.message', content: message, idempotency_key: `web-${sessionId}-${Date.now()}` },
    ])
    return send(res, 200, { sessionId })
  }

  if (req.method === 'GET') {
    const url = new URL(req.url, 'http://x')
    const sessionId = url.searchParams.get('session')
    const afterSeq = Number(url.searchParams.get('afterSeq') ?? -1)
    if (!sessionId) return send(res, 400, { error: 'session required' })

    const { events, lastSeq } = await eventsAfter(sessionId, afterSeq)

    const out = []
    let done = false
    let outcome = null
    for (const ev of events) {
      if (ev.eventType === 'user.message') { out.push({ kind: 'user', seq: ev.seq, text: userText(ev) }); continue }
      if (ev.eventType === 'attachment.created') {
        const p = ev.payload || {}
        if (p.fileName) out.push({ kind: 'media', seq: ev.seq, fileName: p.fileName, mimeType: p.mimeType || '', size: p.size || 0 })
        continue
      }
      const text = assistantText(ev)
      if (text) out.push({ kind: 'text', seq: ev.seq, text })
      const tc = toolCall(ev)
      if (tc?.phase === 'start') out.push({ kind: 'tool', seq: ev.seq, name: tc.toolName, args: tc.args })
      if (ev.eventType === 'agent.error') out.push({ kind: 'error', seq: ev.seq, message: ev.payload?.errorMessage ?? 'agent error' })
      if (isRunFinished(ev)) { done = true; outcome = runOutcome(ev) }
    }
    return send(res, 200, { events: out, lastSeq, done, outcome })
  }

  send(res, 405, { error: 'method not allowed' })
})
