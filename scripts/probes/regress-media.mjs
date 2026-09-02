import { createZooworkClient, assistantText } from '@zoowork-ai/sdk'
import { allEvents } from '../api/_events.js'
const zc = createZooworkClient()
const ss = await zc.listSessions(process.env.IP_AGENT_ID)
const IMG = /https?:\/\/[^\s)<>"'）】，。]+?\.(?:png|jpe?g|webp|gif|avif)/gi
let bad = 0
for (const s of ss) {
  const evs = await allEvents(s.session_id)
  let txt = ''
  for (const e of evs) txt += assistantText(e)
  const urls = (txt.match(IMG) || []).length
  const media = (txt.match(/^MEDIA/gm) || []).length
  const tbl = (txt.match(/^\s*\|[\s:|-]+\|\s*$/gm) || []).length
  if (urls || media || tbl) {
    console.log(`  ${(s.metadata?.title||'?').padEnd(22)} 原文含: 链接 ${String(urls).padStart(2)} · MEDIA ${String(media).padStart(2)} · 表格 ${String(tbl).padStart(2)}  → 前端应全部转成图/表`)
    bad++
  }
}
console.log(bad ? `\n共 ${bad} 个会话的原文里有这些内容，全部由前端接管渲染` : '\n没有会话含此类内容')
