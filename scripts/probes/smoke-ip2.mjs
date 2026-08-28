import { createZooclawClient, assistantText, isRunFinished, runOutcome, toolCall } from '@zooclaw-agents/sdk'
const zc = createZooclawClient()
const AGENT_ID = process.env.IP_AGENT_ID
const SESSION_ID = process.env.IP_SESSION_ID
let cursor = process.env.IP_CURSOR || undefined

await zc.postEvents(AGENT_ID, SESSION_ID, [{ type: 'user.message', content: '同意，按 A1/A2/B1/B2/C1/C2 生成这 6 张候选图。' }])

let reply = ''
const calls = []
const t0 = Date.now()
for await (const ev of zc.streamEvents(AGENT_ID, SESSION_ID, cursor ? { cursor } : {})) {
  cursor = ev.cursor ?? cursor
  reply += assistantText(ev)
  const c = toolCall(ev)
  if (c?.phase === 'start') {
    const a = JSON.stringify(c.args ?? {})
    calls.push({ phase: 'start', name: c.toolName, args: c.args })
    console.error(`[${((Date.now()-t0)/1000).toFixed(0)}s] START ${c.toolName} ${a.slice(0, 500)}`)
  }
  if (c?.phase === 'end') {
    calls.push({ phase: 'end', name: c.toolName, isError: c.isError, result: c.result })
    console.error(`[${((Date.now()-t0)/1000).toFixed(0)}s] END   ${c.toolName} isError=${c.isError} :: ${JSON.stringify(c.result ?? '').slice(0, 700)}`)
  }
  if (isRunFinished(ev)) { console.error('RUN', runOutcome(ev)); break }
}
console.log('########## TURN 2 REPLY ##########')
console.log(reply)
console.log('\n########## TOOL CALLS (full) ##########')
console.log(JSON.stringify(calls, null, 2))
console.log('\nCURSOR=' + cursor)
