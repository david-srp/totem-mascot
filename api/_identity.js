import { createRemoteJWKSet, jwtVerify } from 'jose'

const ACCESS_TEAM_DOMAIN = process.env.CF_ACCESS_TEAM_DOMAIN || 'rebyte-admin.cloudflareaccess.com'
const ACCESS_AUD = process.env.CF_ACCESS_AUD
const IDENTITY_URL = process.env.TOTEM_IDENTITY_URL
const IDENTITY_TOKEN = process.env.TOTEM_IDENTITY_SERVICE_TOKEN
const ALLOWED_DOMAIN = process.env.TOTEM_ALLOWED_EMAIL_DOMAIN || 'srp.one'

const jwks = createRemoteJWKSet(new URL(`https://${ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`))
const cache = new Map()

function tokenFrom(req) {
  const assertion = req.headers['cf-access-jwt-assertion']
  if (assertion) return String(assertion)
  const cookie = String(req.headers.cookie || '')
  return cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1] || null
}

function localIdentity(req) {
  const host = String(req.headers.host || '').split(':')[0]
  const email = process.env.TOTEM_DEV_EMAIL?.trim().toLowerCase()
  if (!email || !['127.0.0.1', 'localhost'].includes(host)) return null
  return { provider: 'dev', subject: `dev:${email}`, email }
}

async function accessIdentity(req) {
  const local = localIdentity(req)
  if (local) return local
  const token = tokenFrom(req)
  if (!token) throw Object.assign(new Error('authentication required'), { statusCode: 401 })
  if (!ACCESS_AUD) throw new Error('CF_ACCESS_AUD 未配置')
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `https://${ACCESS_TEAM_DOMAIN}`,
    audience: ACCESS_AUD,
  })
  const subject = String(payload.sub || '')
  const email = String(payload.email || '').trim().toLowerCase()
  if (!subject || !email) throw Object.assign(new Error('Access token missing sub/email'), { statusCode: 401 })
  if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) throw Object.assign(new Error('email domain not allowed'), { statusCode: 403 })
  return { provider: 'cloudflare-access', subject, email }
}

async function registry(path, body) {
  if (!IDENTITY_URL || !IDENTITY_TOKEN) throw new Error('Totem identity service 未配置')
  const r = await fetch(new URL(path, IDENTITY_URL), {
    method: 'POST',
    headers: { authorization: `Bearer ${IDENTITY_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`identity service ${r.status}: ${data.error || 'unknown error'}`)
  return data
}

/** 验证 Cloudflare Access JWT，并把外部身份解析成稳定的应用 userId。 */
export async function identityOf(req) {
  const external = await accessIdentity(req)
  const key = `${external.provider}:${external.subject}`
  const hit = cache.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.value
  const value = await registry('/v1/identity/resolve', external)
  cache.set(key, { value, expiresAt: Date.now() + 60_000 })
  return value
}

export async function bindAgent(userId, agentId, identityHash) {
  const value = await registry('/v1/agent/bind', { userId, agentId, identityHash })
  for (const entry of cache.values()) {
    if (entry.value.userId === userId) entry.value = { ...entry.value, agentId, identityHash }
  }
  return value
}

export async function recordIdentityHash(userId, identityHash) {
  const value = await registry('/v1/agent/identity', { userId, identityHash })
  if (!value.updated) throw new Error(`identity service 找不到 user ${userId} 的 Agent binding`)
  for (const entry of cache.values()) {
    if (entry.value.userId === userId) entry.value = { ...entry.value, identityHash }
  }
  return value
}
