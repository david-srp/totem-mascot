import { createZooworkClient } from '@zoowork-ai/sdk'
const zc = createZooworkClient()
const ss = await zc.listSessions(process.env.IP_AGENT_ID)
console.log('count:', ss.length)
console.log(JSON.stringify(ss.slice(0, 3), null, 1))
