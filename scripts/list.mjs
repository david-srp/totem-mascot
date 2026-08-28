import { createZooclawClient } from '@zooclaw-agents/sdk'
const zc = createZooclawClient()
const agents = await zc.listAgents()
for (const a of agents) {
  const d = a.declared ?? {}
  console.log(`${a.agent_id}  ${(d.name ?? '?').padEnd(24)} ${(d.model?.primary ?? '?').padEnd(28)} state=${a.status?.desired_state ?? '?'}/${a.status?.actual_state ?? '?'} cfgv=${a.status?.config_version ?? '?'} sandbox=${d.sandbox?.scope ?? '?'}`)
}
