import { createZooworkClient } from '@zoowork-ai/sdk'
const zc = createZooworkClient()
const ss = await zc.listSessions(process.env.IP_AGENT_ID)
const s = ss.find(x => x.metadata?.title === 'Anna Test')
console.log(s?.session_id)
