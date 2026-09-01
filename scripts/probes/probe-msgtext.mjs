import { messageText } from '@zoowork-ai/sdk'
import { allEvents } from '../api/_events.js'
const evs = await allEvents(process.env.SID)
const um = evs.filter(e => e.eventType === 'user.message').slice(0, 3)
for (const ev of um) {
  console.log(`seq ${ev.seq}`)
  console.log('  messageText(ev)               ->', JSON.stringify(messageText(ev)))
  console.log('  messageText(ev.payload)       ->', JSON.stringify(messageText(ev.payload)))
  console.log('  messageText(ev.payload.content)->', JSON.stringify(messageText(ev.payload.content)).slice(0,70))
}
