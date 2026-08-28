import { createZooclawClient } from '@zooclaw-agents/sdk'
const zc = createZooclawClient()
const a = await zc.getAgent(process.env.IP_AGENT_ID)
const sk = await zc.listAgentSkills(process.env.IP_AGENT_ID)
console.log('  agent      :', a.agent_id)
console.log('  model      :', a.declared?.model?.primary)
console.log('  cfg version:', a.status?.config_version)
console.log('  persona    :', a.declared?.persona?.docs?.[0]?.content?.length, 'chars')
console.log('  skills     :', sk.filter(s=>s.eligible!==false).map(s=>s.name).join(', '))
