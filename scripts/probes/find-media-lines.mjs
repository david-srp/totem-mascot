import { createZooclawClient } from '@zooclaw-agents/sdk'
import { allEvents } from '../api/_events.js'
import { assistantText } from '@zooclaw-agents/sdk'
const zc = createZooclawClient()
const ss = await zc.listSessions(process.env.IP_AGENT_ID)
for (const s of ss.slice(0, 10)) {
  const evs = await allEvents(s.session_id)
  let txt = ''
  for (const e of evs) txt += assistantText(e)
  const media = txt.match(/^MEDIA:.*$/gm) || []
  const tbl = txt.match(/^\|[^\n]*\|$/gm) || []
  const manifest = /```ipal-manifest/.test(txt)
  if (media.length || tbl.length)
    console.log(`${(s.metadata?.title||'?').padEnd(24)} MEDIA行 ${String(media.length).padStart(2)} | 表格行 ${String(tbl.length).padStart(3)} | 有清单 ${manifest} | ${s.session_id}`)
}
