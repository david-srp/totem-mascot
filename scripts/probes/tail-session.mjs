import { createZooworkClient, assistantText, messageText, toolCall, isRunFinished, runOutcome } from '@zoowork-ai/sdk'
const zc = createZooworkClient()
const evs = await zc.listAllEvents(process.env.IP_AGENT_ID, process.env.IP_SESSION_ID)
console.error('total events:', evs.length)
// 找最后一个 user.message 的位置，之后的都是本轮
let start = 0
evs.forEach((e, i) => { if (e.eventType === 'user.message') start = i })
let reply = ''
for (const ev of evs.slice(start)) {
  reply += assistantText(ev)
  const c = toolCall(ev)
  if (c?.phase === 'start') console.error(`  ${c.toolName} ${JSON.stringify(c.args ?? {}).slice(0, 130)}`)
  if (isRunFinished(ev)) console.error('  ->', runOutcome(ev))
}
console.error('LAST CURSOR=' + (evs[evs.length-1]?.cursor ?? ''))
console.log(reply)
