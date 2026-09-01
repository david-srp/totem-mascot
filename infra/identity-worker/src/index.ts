interface Env {
  DB: D1Database
  TOTEM_SERVICE_TOKEN: string
}

interface ResolveBody {
  provider?: string
  subject?: string
  email?: string
}

interface BindBody {
  userId?: string
  agentId?: string
  identityHash?: string
}

const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { 'cache-control': 'no-store' } })

function authorized(request: Request, env: Env) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  return Boolean(token && env.TOTEM_SERVICE_TOKEN && token === env.TOTEM_SERVICE_TOKEN)
}

function normalizedEmail(value: unknown) {
  const email = String(value ?? '').trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

async function resolveIdentity(request: Request, env: Env) {
  const body = await request.json<ResolveBody>()
  const provider = String(body.provider ?? '').trim()
  const subject = String(body.subject ?? '').trim()
  const email = normalizedEmail(body.email)
  if (!provider || !subject || !email) return json({ error: 'provider, subject and email required' }, 400)

  const now = new Date().toISOString()
  let identity = await env.DB.prepare(
    `SELECT u.id, u.email, a.zooclaw_agent_id AS agentId,
            a.identity_hash AS identityHash
       FROM identities i
       JOIN users u ON u.id = i.user_id
       LEFT JOIN agent_bindings a ON a.user_id = u.id
      WHERE i.provider = ? AND i.subject = ?`,
  ).bind(provider, subject).first<{ id: string; email: string; agentId: string | null; identityHash: string | null }>()

  if (!identity) {
    // email 是账号恢复键。Access 用户被删除再加入时 sub 可能变化，但已验证邮箱不变。
    let user = await env.DB.prepare('SELECT id, email FROM users WHERE email = ?')
      .bind(email).first<{ id: string; email: string }>()
    if (!user) {
      user = { id: crypto.randomUUID(), email }
      await env.DB.prepare('INSERT INTO users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)')
        .bind(user.id, email, now, now).run()
    }
    await env.DB.prepare(
      `INSERT INTO identities (provider, subject, user_id, email, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(provider, subject) DO UPDATE SET email=excluded.email, updated_at=excluded.updated_at`,
    ).bind(provider, subject, user.id, email, now, now).run()
    identity = { id: user.id, email: user.email, agentId: null, identityHash: null }
  } else if (identity.email !== email) {
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET email = ?, updated_at = ? WHERE id = ?').bind(email, now, identity.id),
      env.DB.prepare('UPDATE identities SET email = ?, updated_at = ? WHERE provider = ? AND subject = ?')
        .bind(email, now, provider, subject),
    ])
    identity.email = email
  }

  return json({ userId: identity.id, email: identity.email, agentId: identity.agentId, identityHash: identity.identityHash })
}

function normalizedIdentityHash(value: unknown) {
  const hash = String(value ?? '').trim().toLowerCase()
  return /^[a-f0-9]{64}$/.test(hash) ? hash : null
}

async function bindAgent(request: Request, env: Env) {
  const body = await request.json<BindBody>()
  const userId = String(body.userId ?? '').trim()
  const agentId = String(body.agentId ?? '').trim()
  const identityHash = normalizedIdentityHash(body.identityHash)
  if (!userId || !/^agt_[A-Za-z0-9]+$/.test(agentId) || !identityHash) {
    return json({ error: 'valid userId, agentId and identityHash required' }, 400)
  }
  const now = new Date().toISOString()
  await env.DB.prepare(
    `INSERT INTO agent_bindings (user_id, zooclaw_agent_id, identity_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       zooclaw_agent_id=excluded.zooclaw_agent_id,
       identity_hash=excluded.identity_hash,
       updated_at=excluded.updated_at`,
  ).bind(userId, agentId, identityHash, now, now).run()
  return json({ userId, agentId, identityHash })
}

async function updateIdentityHash(request: Request, env: Env) {
  const body = await request.json<BindBody>()
  const userId = String(body.userId ?? '').trim()
  const identityHash = normalizedIdentityHash(body.identityHash)
  if (!userId || !identityHash) return json({ error: 'valid userId and identityHash required' }, 400)
  const now = new Date().toISOString()
  const result = await env.DB.prepare(
    'UPDATE agent_bindings SET identity_hash = ?, updated_at = ? WHERE user_id = ?',
  ).bind(identityHash, now, userId).run()
  return json({ updated: result.meta.changes === 1 })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401)
    const url = new URL(request.url)
    if (request.method === 'GET' && url.pathname === '/health') return json({ ok: true })
    if (request.method === 'POST' && url.pathname === '/v1/identity/resolve') return resolveIdentity(request, env)
    if (request.method === 'POST' && url.pathname === '/v1/agent/bind') return bindAgent(request, env)
    if (request.method === 'POST' && url.pathname === '/v1/agent/identity') return updateIdentityHash(request, env)
    return json({ error: 'not found' }, 404)
  },
} satisfies ExportedHandler<Env>
