import { createZooclawClient } from '@zooclaw-agents/sdk'
import { writeFile } from 'node:fs/promises'
const zc = createZooclawClient()
const A = process.env.IP_AGENT_ID
const CHUNK = 140_000

async function sh(s){ const o = await zc.exec(A, ['bash','-lc',s]); if(o.exit_code) throw new Error(`exec ${o.exit_code}: ${o.stderr.slice(0,200)}`); return o.stdout }

const listing = await sh(`ls -la /workspace/logos/pomodoro-app/ 2>/dev/null || echo EMPTY`)
console.log(listing)

for (const p of ['/workspace/logos/pomodoro-app/A1.web.jpg', '/workspace/logos/pomodoro-app/A1.png']) {
  const size = Number((await sh(`stat -c %s ${JSON.stringify(p)} 2>/dev/null || echo 0`)).trim())
  if (!size) { console.log(p, '-> 不存在'); continue }
  const b64len = Math.ceil(size/3)*4
  const t0 = Date.now()
  let b64 = ''
  if (b64len <= CHUNK) b64 = (await sh(`base64 -w0 ${JSON.stringify(p)}`)).trim()
  else for (let s = 1; s <= b64len; s += CHUNK) {
    const e = Math.min(s + CHUNK - 1, b64len)
    b64 += (await sh(`base64 -w0 ${JSON.stringify(p)} | cut -c${s}-${e}`)).trim()
  }
  const buf = Buffer.from(b64, 'base64')
  const ok = buf.length === size
  const magic = buf.subarray(0,4).toString('hex')
  console.log(`${p}\n  原始 ${size}B, 取回 ${buf.length}B, 完整=${ok}, 分块=${Math.ceil(b64len/CHUNK)}, 耗时 ${((Date.now()-t0)/1000).toFixed(1)}s, magic=${magic}`)
  if (ok) await writeFile(process.env.SP + '/' + p.split('/').pop(), buf)
}
