import { createZooclawClient } from '@zooclaw-agents/sdk'
import { writeFile } from 'node:fs/promises'
const zc = createZooclawClient()
const p = await zc.listArtifacts(process.env.IP_AGENT_ID, { sessionId: process.env.SID, limit: 100 })
for (const a of p.artifacts) {
  const r = await fetch(a.url)
  const buf = Buffer.from(await r.arrayBuffer())
  await writeFile(`${process.env.SP}/cb-${a.file_name}`, buf)
  console.log(a.file_name, r.status, buf.length)
}
