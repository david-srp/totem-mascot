import { allEvents } from '../api/_events.js'
const evs = await allEvents(process.env.SID)
console.log('事件数:', evs.length)
const types = {}
for (const e of evs) types[e.eventType] = (types[e.eventType]||0)+1
console.log('事件类型:', JSON.stringify(types))
// 找 payload 里带 media / attachment / image / url 的
const hit = []
for (const e of evs) {
  const s = JSON.stringify(e.payload ?? {})
  if (/media|attachment|artifact|image_url|\.png/i.test(s)) hit.push(e)
}
console.log('\n含媒体线索的事件:', hit.length)
for (const e of hit.slice(0, 6)) {
  console.log(`\n--- seq ${e.seq} ${e.eventType} ---`)
  console.log('  payload keys:', Object.keys(e.payload ?? {}))
  console.log('  ' + JSON.stringify(e.payload).slice(0, 420))
}
