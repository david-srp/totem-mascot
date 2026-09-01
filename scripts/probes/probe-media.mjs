import { createZooworkClient } from '@zoowork-ai/sdk'
const zc = createZooworkClient()
const A = process.env.IP_AGENT_ID
const ss = await zc.listSessions(A)
console.log('会话数:', ss.length)
// 找含 artifacts 的会话
for (const s of ss.slice(0, 12)) {
  const p = await zc.listArtifacts(A, { sessionId: s.session_id, limit: 100 })
  const n = p.artifacts?.length ?? 0
  console.log(`  ${s.session_id.slice(0,10)}  ${(s.metadata?.title||'(无题)').padEnd(22)} artifacts=${n}`)
  if (n) {
    for (const a of p.artifacts.slice(0,6))
      console.log(`      ${a.file_name.padEnd(30)} ${a.content_type}  ${a.size}B  ${a.url ? 'url ✓' : 'NO URL'}`)
  }
}
