// 把沙箱 /workspace/logos 下的图片取出来喂给浏览器。
// exec 的 stdout 上限 200,000 字符，所以预览图走单次 base64，原图 PNG 分块拼接。
import { createZooclawClient, ZooclawError } from '@zooclaw-agents/sdk'

export const config = { maxDuration: 60 }

const zc = createZooclawClient()
const AGENT_ID = process.env.IP_AGENT_ID

const SAFE = /^\/workspace\/logos\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+\.(png|jpg|jpeg|webp)$/
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }
const CHUNK = 140_000 // base64 字符/次，留足 200k 上限的余量

async function sh(script) {
  const out = await zc.exec(AGENT_ID, ['bash', '-lc', script])
  if (out.exit_code !== 0) throw new Error(`exec ${out.exit_code}: ${(out.stderr || '').slice(0, 300)}`)
  return out.stdout
}

export default async function handler(req, res) {
  if (!AGENT_ID) { res.status(500).end('IP_AGENT_ID 未配置'); return }

  const url = new URL(req.url, 'http://x')
  const p = url.searchParams.get('path') || ''
  // 白名单校验：只允许 /workspace/logos 下的图片，挡掉路径穿越
  if (!SAFE.test(p) || p.includes('..')) { res.status(400).end('bad path'); return }

  const ext = p.split('.').pop().toLowerCase()

  try {
    const sizeStr = (await sh(`stat -c %s ${JSON.stringify(p)} 2>/dev/null || echo 0`)).trim()
    const size = Number(sizeStr)
    if (!size) { res.status(404).end('not found'); return }

    const b64len = Math.ceil(size / 3) * 4
    let b64 = ''
    if (b64len <= CHUNK) {
      b64 = (await sh(`base64 -w0 ${JSON.stringify(p)}`)).trim()
    } else {
      for (let start = 1; start <= b64len; start += CHUNK) {
        const end = Math.min(start + CHUNK - 1, b64len)
        b64 += (await sh(`base64 -w0 ${JSON.stringify(p)} | cut -c${start}-${end}`)).trim()
      }
    }

    const buf = Buffer.from(b64, 'base64')
    if (!buf.length) { res.status(502).end('empty'); return }

    res.status(200)
    res.setHeader('content-type', MIME[ext] || 'application/octet-stream')
    res.setHeader('content-length', String(buf.length))
    res.setHeader('cache-control', 'public, max-age=31536000, immutable')
    if (url.searchParams.get('download')) {
      res.setHeader('content-disposition', `attachment; filename="${p.split('/').pop()}"`)
    }
    res.end(buf)
  } catch (e) {
    const msg = e instanceof ZooclawError ? `${e.status} ${e.type}` : String(e?.message ?? e)
    res.status(502).end(msg.slice(0, 200))
  }
}
