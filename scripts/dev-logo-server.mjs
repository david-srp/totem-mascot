// 本地跑真实的 Node-style API handler，方便在浏览器里验证 UI。
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import logo from '../api/logo.js'
import logoImage from '../api/logo-image.js'
import projects from '../api/projects.js'
import history from '../api/history.js'
import artifacts from '../api/artifacts.js'

const PUBLIC = path.resolve(import.meta.dirname, '../public')
const PORT = Number(process.env.DEV_PORT ?? 5290)
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.webp':'image/webp', '.woff2':'font/woff2' }

// 给 Node 的 res 补上 handler 用到的 status()/json()
function shim(res){
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (o) => { res.setHeader('content-type','application/json; charset=utf-8'); res.end(JSON.stringify(o)) }
  return res
}

http.createServer(async (req, res) => {
  shim(res)
  const url = new URL(req.url, 'http://x')
  try {
    if (url.pathname === '/api/logo') return void await logo(req, res)
    if (url.pathname === '/api/logo-image') return void await logoImage(req, res)
    if (url.pathname === '/api/projects') return void await projects(req, res)
    if (url.pathname === '/api/history') return void await history(req, res)
    if (url.pathname === '/api/artifacts') return void await artifacts(req, res)
    const rel = url.pathname === '/' ? '/index.html' : url.pathname === '/app' ? '/app.html' : url.pathname === '/guide' ? '/guide.html' : url.pathname
    const file = path.join(PUBLIC, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''))
    if (!file.startsWith(PUBLIC)) { res.statusCode = 403; return res.end('forbidden') }
    const buf = await readFile(file)
    res.setHeader('content-type', TYPES[path.extname(file)] ?? 'application/octet-stream')
    res.end(buf)
  } catch (e) {
    if (e.code === 'ENOENT') { res.statusCode = 404; res.end('not found') }
    else { console.error(e); res.statusCode = 500; res.end(String(e.message)) }
  }
}).listen(PORT, () => console.log(`dev server -> http://127.0.0.1:${PORT}`))
