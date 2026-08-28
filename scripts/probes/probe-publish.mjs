import { createZooclawClient, assistantText, isRunFinished, runOutcome, toolCall } from '@zooclaw-agents/sdk'
const zc = createZooclawClient()
const A = process.env.IP_AGENT_ID
const s = await zc.createSession(A, {
  initial_events: [{ type: 'user.message', content: '不要生成任何新图。请把已有文件 /workspace/logos/pomodoro-app/A1.png 发布为 artifact，然后告诉我：(1) 你到底有没有 artifact_publish 这个工具 (2) 如果有，返回的 artifact id 是什么 (3) 如果没有，把你实际可用的工具名字全部列出来。' }],
  metadata: { origin: 'probe-publish' },
})
let reply = ''
for await (const ev of zc.streamEvents(A, s.session_id)) {
  reply += assistantText(ev)
  const c = toolCall(ev)
  if (c?.phase === 'start') console.error(`  TOOL ${c.toolName} ${JSON.stringify(c.args??{}).slice(0,200)}`)
  if (c?.phase === 'end') console.error(`  END  ${c.toolName} isError=${c.isError} ${JSON.stringify(c.result??'').slice(0,300)}`)
  if (isRunFinished(ev)) { console.error('->', runOutcome(ev)); break }
}
console.log(reply)
console.error('SESSION=' + s.session_id)
const arts = await zc.listArtifacts(A, { sessionId: s.session_id })
console.error('listArtifacts(session):', JSON.stringify(arts).slice(0, 600))
