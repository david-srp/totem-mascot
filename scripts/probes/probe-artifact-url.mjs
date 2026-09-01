import { createZooworkClient } from '@zoowork-ai/sdk'
const zc = createZooworkClient()
const A = process.env.IP_AGENT_ID
const p = await zc.listArtifacts(A, { limit: 3 })
const row = p.artifacts[0]
console.log('列表里的 url:', row.url)
const dl = await zc.downloadArtifact(A, row.artifact_id)
console.log('downloadArtifact 返回:', JSON.stringify(dl).slice(0, 300))
// 两个 URL 是否可直接取
for (const [tag, u] of [['list.url', row.url], ['download.url', dl.url]]) {
  if (!u) { console.log(tag, '-> 无'); continue }
  const r = await fetch(u, { method: 'GET' })
  console.log(`${tag} -> HTTP ${r.status} ${r.headers.get('content-type')} ${r.headers.get('content-length')}`)
}
