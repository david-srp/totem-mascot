import artifacts from '../api/artifacts.js'
import history from '../api/history.js'
import logo from '../api/logo.js'
import logoImage from '../api/logo-image.js'
import projects from '../api/projects.js'

const apiRoutes = new Map([
  ['/api/artifacts', artifacts],
  ['/api/history', history],
  ['/api/logo', logo],
  ['/api/logo-image', logoImage],
  ['/api/projects', projects],
])

/**
 * 现有 API handler 使用 Node req/res 形状。本 adapter 只实现它们实际使用的最小接口，
 * 让同一套业务代码直接运行在 Cloudflare Worker。
 */
function nodeRequest(request) {
  const headers = Object.fromEntries(request.headers.entries())
  return {
    method: request.method,
    url: request.url,
    headers,
    async *[Symbol.asyncIterator]() {
      const body = await request.arrayBuffer()
      if (body.byteLength) yield Buffer.from(body)
    },
  }
}

async function runHandler(handler, request) {
  let finish
  const finished = new Promise((resolve) => { finish = resolve })
  const headers = new Headers()
  let ended = false

  const response = {
    statusCode: 200,
    setHeader(name, value) { headers.set(name, String(value)) },
    status(code) { this.statusCode = code; return this },
    json(value) {
      this.setHeader('content-type', 'application/json; charset=utf-8')
      this.end(JSON.stringify(value))
    },
    end(body = null) {
      if (ended) return
      ended = true
      finish(new Response(body, { status: this.statusCode, headers }))
    },
  }

  await handler(nodeRequest(request), response)
  if (!ended) response.end()
  return finished
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const handler = apiRoutes.get(url.pathname)
    if (handler) return runHandler(handler, request)

    return env.ASSETS.fetch(request)
  },
}
