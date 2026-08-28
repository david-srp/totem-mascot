import { allEvents, userText } from '../api/_events.js'
const evs = await allEvents(process.env.SID)
for (const ev of evs.filter(e => e.eventType === 'user.message')) {
  const t = userText(ev)
  console.log(`  seq ${String(ev.seq).padStart(3)} | ${typeof t} | ${JSON.stringify(t).slice(0,72)}`)
}
