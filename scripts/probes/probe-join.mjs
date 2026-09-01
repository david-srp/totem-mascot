import { allEvents } from '../api/_events.js'
import { createZooworkClient } from '@zoowork-ai/sdk'
const zc = createZooworkClient()
const A = process.env.IP_AGENT_ID, S = process.env.SID
const evs = await allEvents(S)
const att = evs.filter(e => e.eventType === 'attachment.created')
  .map(e => ({ name: e.payload.fileName, size: e.payload.size, mime: e.payload.mimeType, turn: e.turn, seq: e.seq }))
const arts = (await zc.listArtifacts(A, { sessionId: S, limit: 100 })).artifacts ?? []
const byName = new Map(arts.map(a => [a.file_name, a]))
console.log('附件事件', att.length, '| artifact 行', arts.length, '\n')
let ok = 0
for (const a of att) {
  const m = byName.get(a.name)
  const same = m && m.size === a.size
  if (same) ok++
  console.log(`  ${a.name.padEnd(30)} turn=${a.turn} ${a.mime.padEnd(10)} ${same ? '✓ 匹配到 url' : '✗ 无匹配'}`)
}
console.log(`\n按 fileName 关联成功 ${ok}/${att.length}`)
console.log('示例 url:', byName.get(att[0]?.name)?.url)
