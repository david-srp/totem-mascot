import { allEvents } from '../api/_events.js'
for (const [name, sid] of [['冷萃(artifact_publish)', 'a1bb2ecf273342b2835f0c32f6c8f8e4'], ['Anna(attachment_publish)', '149e4b421ea5452887eaa75f65d963f1']]) {
  const evs = await allEvents(sid)
  const at = evs.filter(e => e.eventType === 'attachment.created')
  const tools = new Set(evs.map(e => e.payload?.toolName).filter(t => /publish/.test(t||'')))
  console.log(`${name}: attachment.created=${at.length}, 用到的发布工具=${[...tools].join(',')||'无'}`)
}
