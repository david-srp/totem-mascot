import { createZooclawClient } from '@zooclaw-agents/sdk'
const zc = createZooclawClient()
const ss = await zc.listSessions(process.env.IP_AGENT_ID)
const s = ss.find(x => x.metadata?.title === 'Anna Test')
console.log(s?.session_id)
