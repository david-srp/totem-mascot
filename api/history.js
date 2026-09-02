// 打开项目时把整段历史还原成多轮对话，并给出可继续轮询的游标。
import { assistantText, toolCall, isRunFinished, runOutcome } from '@zoowork-ai/sdk'
import { send, route } from './_zc.js'
import { allEvents, userText } from './_events.js'
import { findAgent } from './_agent.js'
import { identityOf } from './_identity.js'

export const config = { maxDuration: 60 }

export default route(async (req, res) => {
  const identity = await identityOf(req)
  const sid = new URL(req.url, 'http://x').searchParams.get('session')
  if (!sid) return send(res, 400, { error: 'session required' })
  const agentId = await findAgent(identity)
  if (!agentId) return send(res, 404, { error: 'no agent for this user' })

  const events = await allEvents(agentId, sid)

  const turns = []
  let cur = null
  let running = false

  for (const ev of events) {
    if (ev.eventType === 'user.message') {
      if (cur) turns.push(cur)
      cur = { role: 'user', text: userText(ev), reply: '', tools: [], media: [], from: ev.createdAt || null, to: null, outcome: null }
      running = true
      continue
    }
    if (!cur) continue
    if (ev.createdAt) cur.to = ev.createdAt
    // agent 交付文件时发的事件，带文件名和类型但【没有 url】，url 要按文件名去 artifacts 里取
    if (ev.eventType === 'attachment.created') {
      const p = ev.payload || {}
      if (p.fileName) cur.media.push({ fileName: p.fileName, mimeType: p.mimeType || '', size: p.size || 0 })
      continue
    }
    cur.reply += assistantText(ev)
    const tc = toolCall(ev)
    if (tc?.phase === 'start') cur.tools.push({ name: tc.toolName, args: tc.args })
    if (isRunFinished(ev)) { cur.outcome = runOutcome(ev); running = false }
  }
  if (cur) turns.push(cur)

  const lastSeq = events.length ? events[events.length - 1].seq : -1
  send(res, 200, { turns, lastSeq, running, eventCount: events.length })
})
