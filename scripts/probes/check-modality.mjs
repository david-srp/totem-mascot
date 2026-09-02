import { createZooworkClient } from '@zoowork-ai/sdk'
const zc = createZooworkClient()
const a = await zc.getAgent(process.env.IP_AGENT_ID)
console.log('model:', JSON.stringify(a.declared?.model, null, 2))
