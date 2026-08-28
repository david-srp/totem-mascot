import { createZooclawClient } from '@zooclaw-agents/sdk'
const zc = createZooclawClient()
const a = await zc.getAgent(process.env.IP_AGENT_ID)
console.log('model:', JSON.stringify(a.declared?.model, null, 2))
