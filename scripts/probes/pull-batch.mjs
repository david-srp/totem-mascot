import { createZooclawClient } from '@zooclaw-agents/sdk'
import { writeFile } from 'node:fs/promises'
const zc = createZooclawClient()
const A = process.env.IP_AGENT_ID, SP = process.env.SP
async function sh(s){ const o = await zc.exec(A, ['bash','-lc',s]); if(o.exit_code) throw new Error(o.stderr.slice(0,200)); return o.stdout }
// 一次把六张预览图全部 base64 出来，用分隔符切开
const out = await sh(`for f in A1 A2 B1 B2 C1 C2; do echo "===$f"; base64 -w0 /workspace/logos/pomodoro-app/$f.web.jpg; echo; done`)
for (const chunk of out.split('===').slice(1)) {
  const nl = chunk.indexOf('\n')
  const label = chunk.slice(0, nl).trim()
  const b64 = chunk.slice(nl + 1).trim()
  const buf = Buffer.from(b64, 'base64')
  await writeFile(`${SP}/${label}.jpg`, buf)
  console.log(label, buf.length, 'bytes')
}
