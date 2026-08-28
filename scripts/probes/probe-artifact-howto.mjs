import { createZooclawClient } from '@zooclaw-agents/sdk'
const zc = createZooclawClient()
const agents = await zc.listAgents()

// 1) 已跑通视频发布的 agent，看它的 persona 怎么写 artifact
for (const name of ['motion-video-shotcraft-v3', 'motion-video-shotcraft']) {
  const a = agents.find(x => x.declared?.name === name)
  if (!a) { console.log(`\n### ${name}: 未找到`); continue }
  console.log(`\n########## ${name} (${a.agent_id}) ##########`)
  for (const d of a.declared?.persona?.docs ?? []) {
    const hits = d.content.split('\n').map((l,i)=>[i+1,l]).filter(([,l]) => /artifact|产物|发布|publish/i.test(l))
    if (hits.length) {
      console.log(`--- ${d.name} 命中 ${hits.length} 行 ---`)
      for (const [i,l] of hits.slice(0,25)) console.log(`  ${i}: ${l.trim().slice(0,190)}`)
    }
  }
  // 该 agent 有没有 artifact
  try {
    const p = await zc.listArtifacts(a.agent_id, { limit: 5 })
    console.log(`  >>> listArtifacts: ${p.artifacts?.length ?? 0} 条, has_more=${p.has_more}`)
    if (p.artifacts?.length) console.log('  ' + JSON.stringify(p.artifacts[0]).slice(0, 500))
  } catch (e) { console.log('  >>> listArtifacts 失败:', e.message) }
}
