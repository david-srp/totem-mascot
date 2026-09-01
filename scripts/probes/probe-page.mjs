import { createZooworkClient } from '@zoowork-ai/sdk'
const zc = createZooworkClient()
const p = await zc.listEventsPage(process.env.IP_AGENT_ID, process.env.SID, { limit: 5 })
console.log('page keys:', Object.keys(p))
console.log('hasMore:', p.hasMore, '| nextCursor:', JSON.stringify(p.nextCursor))
console.log('events[0] keys:', Object.keys(p.events?.[0] ?? {}))
console.log('每个事件的 cursor:', (p.events??[]).map(e => e.cursor ?? 'MISSING').join(', '))
console.log('每个事件的 seq  :', (p.events??[]).map(e => e.seq).join(', '))
// 再用 nextCursor 取下一页，确认能推进
if (p.nextCursor) {
  const p2 = await zc.listEventsPage(process.env.IP_AGENT_ID, process.env.SID, { cursor: p.nextCursor, limit: 5 })
  console.log('第二页 seq:', (p2.events??[]).map(e=>e.seq).join(', '), '| nextCursor:', JSON.stringify(p2.nextCursor))
}
