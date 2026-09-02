import { createZooworkClient } from '@zoowork-ai/sdk'
const zc = createZooworkClient()
const A = process.env.IP_AGENT_ID, S = process.env.SID
try {
  const r = await zc.postEvents(A, S, [{ type: 'user.interrupt' }])
  console.log('interrupt:', JSON.stringify(r).slice(0, 200))
} catch (e) { console.log('interrupt 失败(可忽略):', e.message) }
for (let i = 0; i < 10; i++) {
  try { console.log('archived:', JSON.stringify(await zc.archiveSession(A, S))); break }
  catch (e) { console.log(`  第${i+1}次归档: ${e.type ?? e.message}`); await new Promise(r=>setTimeout(r,2000)) }
}
