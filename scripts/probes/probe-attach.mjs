import { allEvents } from '../api/_events.js'
const evs = await allEvents(process.env.SID)
const at = evs.filter(e => e.eventType === 'attachment.created')
console.log('attachment.created 事件:', at.length, '\n')
for (const e of at) {
  console.log(`--- seq ${e.seq}  turn=${e.turn ?? '-'}  runId=${e.runId ?? '-'} ---`)
  console.log(JSON.stringify(e.payload, null, 1))
  console.log()
}
