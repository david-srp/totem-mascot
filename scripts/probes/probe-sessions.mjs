import { createZooclawClient } from '@zooclaw-agents/sdk'
const zc = createZooclawClient()
const ss = await zc.listSessions(process.env.IP_AGENT_ID)
console.log('count:', ss.length)
console.log(JSON.stringify(ss.slice(0, 3), null, 1))
