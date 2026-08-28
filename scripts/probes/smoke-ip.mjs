import { createZooclawClient, assistantText, isRunFinished, runOutcome, toolCall } from '@zooclaw-agents/sdk'
const zc = createZooclawClient()
const AGENT_ID = process.env.IP_AGENT_ID
if (!AGENT_ID) throw new Error('set IP_AGENT_ID')

const calls = []
async function turn(agentId, sessionId, cursor) {
  let reply = ''
  for await (const ev of zc.streamEvents(agentId, sessionId, cursor ? { cursor } : {})) {
    cursor = ev.cursor ?? cursor
    reply += assistantText(ev)
    const c = toolCall(ev)
    if (c?.phase === 'start') {
      const a = JSON.stringify(c.args ?? {})
      calls.push(`${c.toolName} ${a.length > 400 ? a.slice(0, 400) + '…' : a}`)
      console.error(`  [tool] ${c.toolName} ${a.slice(0, 300)}`)
    }
    if (c?.phase === 'end' && c.isError) console.error(`  [tool ERROR] ${c.toolName}: ${JSON.stringify(c.result ?? c).slice(0,400)}`)
    if (isRunFinished(ev)) {
      const o = runOutcome(ev)
      console.error(`  [run] ${o}`)
      if (o !== 'succeeded') throw new Error(`run ${o}`)
      break
    }
  }
  return { reply, cursor }
}

console.error('=== turn 1: 请求做 Logo（应给出三个方向，不应直接生成）===')
const session = await zc.createSession(AGENT_ID, {
  initial_events: [{ type: 'user.message', content: '给 ZooClaw 做一个 IP 吉祥物 Logo。ZooClaw 是一个托管 AI agent 的云平台，开发者用它把自己的 agent 跑起来并接上自己的产品。面向开发者，气质要可靠、聪明、有点俏皮。' }],
  metadata: { origin: 'deploy-smoke-test' },
})
console.error('session:', session.session_id)
const t0 = Date.now()
let { reply, cursor } = await turn(AGENT_ID, session.session_id)
console.error(`turn 1 done in ${((Date.now()-t0)/1000).toFixed(1)}s\n`)
console.log('########## TURN 1 REPLY ##########')
console.log(reply)

const consulted = calls.some((c) => c.includes('/skills/ip-as-logo/'))
console.log('\n########## 技能是否被读取 ##########')
console.log('consulted ip-as-logo:', consulted)
console.log('tool calls:', JSON.stringify(calls, null, 2))
console.log('\nSESSION_ID=' + session.session_id)
console.log('CURSOR=' + cursor)
