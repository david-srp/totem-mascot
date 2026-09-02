import { assistantText, toolCall, isRunFinished, runOutcome } from '@zoowork-ai/sdk'
import { allEvents } from '../api/_events.js'
import { createZooworkClient } from '@zoowork-ai/sdk'
const zc = createZooworkClient()
const A = process.env.IP_AGENT_ID, S = process.env.SID
const t0 = Date.now()
let last = 0
for (let i = 0; i < 400; i++) {
  const evs = await allEvents(S)
  // 找最后一个 user.message 之后的事件
  let start = 0
  evs.forEach((e, idx) => { if (e.eventType === 'user.message') start = idx })
  const tail = evs.slice(start)
  const gen = tail.filter(e => { const c = toolCall(e); return c?.phase === 'start' && /image_generation_cli/.test(JSON.stringify(c.args||{})) }).length
  const look = tail.filter(e => { const c = toolCall(e); return c?.phase === 'start' && c.toolName === 'image' }).length
  const pub = tail.filter(e => { const c = toolCall(e); return c?.phase === 'start' && c.toolName === 'artifact_publish' }).length
  const fin = tail.find(e => isRunFinished(e))
  if (gen + look + pub !== last) {
    console.error(`[${((Date.now()-t0)/1000).toFixed(0)}s] 生图 ${gen} · 回看 ${look} · 发布 ${pub}`)
    last = gen + look + pub
  }
  if (fin) {
    console.error(`[${((Date.now()-t0)/1000).toFixed(0)}s] RUN ${runOutcome(fin)}`)
    let reply = ''
    for (const e of tail) reply += assistantText(e)
    console.log(reply)
    const arts = await zc.listArtifacts(A, { sessionId: S, limit: 100 })
    console.error(`\nARTIFACTS: ${arts.artifacts?.length ?? 0} 条`)
    for (const a of arts.artifacts ?? []) console.error(`  ${a.file_name.padEnd(14)} ${String(a.size).padStart(8)}B  ${a.status}  ${a.url ? 'has-url' : 'NO-URL'}`)
    break
  }
  await new Promise(r => setTimeout(r, 5000))
}
