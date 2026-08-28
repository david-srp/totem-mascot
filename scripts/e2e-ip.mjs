import { createZooclawClient, assistantText, isRunFinished, runOutcome, toolCall } from '@zooclaw-agents/sdk'
const zc = createZooclawClient()
const A = process.env.IP_AGENT_ID
let cursor

async function drain(sid, tag){
  let reply = ''
  const t0 = Date.now()
  for await (const ev of zc.streamEvents(A, sid, cursor ? { cursor } : {})) {
    cursor = ev.cursor ?? cursor
    reply += assistantText(ev)
    const c = toolCall(ev)
    if (c?.phase === 'start') {
      const a = JSON.stringify(c.args ?? {})
      console.error(`  [${((Date.now()-t0)/1000).toFixed(0)}s] ${c.toolName} ${a.slice(0,180)}`)
    }
    if (c?.phase === 'end' && c.isError) console.error(`  [ERR] ${c.toolName}`)
    if (isRunFinished(ev)) { console.error(`  ${tag} -> ${runOutcome(ev)} in ${((Date.now()-t0)/1000).toFixed(0)}s`); break }
  }
  return reply
}

console.error('=== TURN 1 ===')
const s = await zc.createSession(A, {
  initial_events: [{ type: 'user.message', content: '给一个专注深度工作的番茄钟 App 做 IP 吉祥物 Logo。用户是需要长时间专注的知识工作者，气质要安静、克制、有陪伴感。' }],
  metadata: { origin: 'e2e' },
})
console.error('session:', s.session_id)
const r1 = await drain(s.session_id, 'turn1')
console.log('########## TURN 1 ##########')
console.log(r1)
console.log('\n>>> turn1 有 directions manifest:', /```ipal-manifest[\s\S]*?"phase"\s*:\s*"directions"/.test(r1))

console.error('\n=== TURN 2（六张图，耗时较长）===')
await zc.postEvents(A, s.session_id, [{ type: 'user.message', content: '同意，生成这 6 张候选图。' }])
const r2 = await drain(s.session_id, 'turn2')
console.log('\n########## TURN 2 ##########')
console.log(r2)
console.log('\n>>> turn2 有 candidates manifest:', /```ipal-manifest[\s\S]*?"phase"\s*:\s*"candidates"/.test(r2))
console.log('SESSION=' + s.session_id)
