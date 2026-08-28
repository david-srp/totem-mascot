import { createZooclawClient, assistantText, isRunFinished, runOutcome, toolCall } from '@zooclaw-agents/sdk'
const zc = createZooclawClient()
const A = process.env.IP_AGENT_ID, S = process.env.IP_SESSION_ID
await zc.postEvents(A, S, [{ type: 'user.message', content: '你刚才把六张全部标成 recommended，但没有回看过任何一张图。现在按规范逐张打开 .web.jpg 预览，对照判废清单认真核对一遍，重新给出评估和 candidates manifest。' }])
let reply = ''
const t0 = Date.now()
for await (const ev of zc.streamEvents(A, S, {})) {
  reply += assistantText(ev)
  const c = toolCall(ev)
  if (c?.phase === 'start') console.error(`  [${((Date.now()-t0)/1000).toFixed(0)}s] ${c.toolName} ${JSON.stringify(c.args??{}).slice(0,150)}`)
  if (isRunFinished(ev)) { console.error('->', runOutcome(ev), `${((Date.now()-t0)/1000).toFixed(0)}s`); break }
}
console.log(reply)
