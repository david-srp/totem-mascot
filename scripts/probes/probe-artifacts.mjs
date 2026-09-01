import { createZooworkClient, ZooworkError } from '@zoowork-ai/sdk'
const zc = createZooworkClient()
try {
  const page = await zc.listArtifacts(process.env.IP_AGENT_ID)
  console.log('listArtifacts OK:', JSON.stringify(page).slice(0, 800))
} catch (e) {
  console.log('listArtifacts failed:', e instanceof ZooworkError ? `${e.status} ${e.type} ${e.message}` : e.message)
}
