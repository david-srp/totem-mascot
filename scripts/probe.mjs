// Cheapest proof a key works: touches no agent, creates nothing.
import { createZooworkClient, ZooworkError, DEFAULT_BASE_URL } from '@zoowork-ai/sdk'

const zc = createZooworkClient() // reads ZOOWORK_API_KEY
console.log('base url:', DEFAULT_BASE_URL)

try {
  const models = await zc.listModels()
  console.log(`\nlistModels() -> ${models.length} model(s)`)
  for (const m of models) console.log('  ', m.model)
} catch (e) {
  if (e instanceof ZooworkError) {
    console.error(`\nZooworkError status=${e.status} type=${e.type}`)
    console.error(e.message)
  } else {
    console.error('\nnon-ZooWork failure:', e)
  }
  process.exit(1)
}
