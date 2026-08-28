import { messageText } from '@zooclaw-agents/sdk'
import { allEvents } from '../api/_events.js'
import { createZooclawClient } from '@zooclaw-agents/sdk'
const zc = createZooclawClient()
const ss = await zc.listSessions(process.env.IP_AGENT_ID)
const sid = process.env.SID || ss.find(s => s.metadata?.app === 'ip-as-logo')?.session_id
console.log('session:', sid)
const evs = await allEvents(sid)
const ums = evs.filter(e => e.eventType === 'user.message')
console.log('user.message 条数:', ums.length)
for (const ev of ums.slice(0, 3)) {
  console.log('\n--- seq', ev.seq, '---')
  console.log('  payload 类型:', typeof ev.payload, '| keys:', Object.keys(ev.payload ?? {}))
  console.log('  payload:', JSON.stringify(ev.payload).slice(0, 300))
  console.log('  content 类型:', typeof ev.payload?.content)
  console.log('  messageText():', JSON.stringify(messageText(ev)))
}
