// Cheapest proof a key works: touches no agent, creates nothing.
import { createZooclawClient, ZooclawError, DEFAULT_BASE_URL } from '@zooclaw-agents/sdk'

const zc = createZooclawClient() // reads ZOOCLAW_API_KEY
console.log('base url:', DEFAULT_BASE_URL)

try {
  const models = await zc.listModels()
  console.log(`\nlistModels() -> ${models.length} model(s)`)
  for (const m of models) console.log('  ', JSON.stringify(m))

  const agents = await zc.listAgents()
  console.log(`\nlistAgents() -> ${Array.isArray(agents) ? agents.length : '?'}`)
  console.log(JSON.stringify(agents, null, 2).slice(0, 2000))
} catch (e) {
  if (e instanceof ZooclawError) {
    console.error(`\nZooclawError status=${e.status} type=${e.type}`)
    console.error(e.message)
  } else {
    console.error('\nnon-Zooclaw failure:', e)
  }
  process.exit(1)
}
