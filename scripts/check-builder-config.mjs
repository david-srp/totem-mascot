import { readFile } from 'node:fs/promises'

const errors = []
const warnings = []
const placeholders = /(^|[^A-Z])(YOUR_|your_|replace_|generate_a_|example\.com)/i

function requireEnv(name, validate = (value) => Boolean(value)) {
  const value = process.env[name]?.trim()
  if (!value || placeholders.test(value) || !validate(value)) errors.push(`${name} 未填写或格式不正确`)
}

async function readConfig(file) {
  try {
    const text = await readFile(file, 'utf8')
    if (placeholders.test(text)) errors.push(`${file} 仍有 placeholder`)
    return JSON.parse(text)
  } catch (error) {
    errors.push(`${file} 不存在或不是有效 JSON：${error.message}`)
    return null
  }
}

function findSecretFields(value, path = '') {
  if (!value || typeof value !== 'object') return []
  const fields = []
  for (const [key, child] of Object.entries(value)) {
    const next = path ? `${path}.${key}` : key
    if (/(?:API_KEY|API_TOKEN|SERVICE_TOKEN|SECRET)$/i.test(key)) fields.push(next)
    fields.push(...findSecretFields(child, next))
  }
  return fields
}

requireEnv('ZOOWORK_API_KEY', (value) => /^zct_[A-Za-z0-9_-]{8,}$/.test(value))
requireEnv('CLOUDFLARE_API_TOKEN', (value) => value.length >= 20)
requireEnv('CLOUDFLARE_ACCOUNT_ID', (value) => /^[a-f0-9]{32}$/i.test(value))
requireEnv('TOTEM_IDENTITY_SERVICE_TOKEN', (value) => value.length >= 32)
requireEnv('TOTEM_DEV_EMAIL', (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))

const app = await readConfig('wrangler.jsonc')
const identity = await readConfig('infra/identity-worker/wrangler.jsonc')

if (app) {
  const vars = app.vars ?? {}
  const route = app.routes?.find((item) => item?.custom_domain)?.pattern
  if (!app.name) errors.push('wrangler.jsonc 缺少 App Worker name')
  if (!route) warnings.push('wrangler.jsonc 没有 custom domain route；请确认 hostname 已在 Cloudflare 外部绑定')
  else if (/:|\//.test(route)) errors.push('wrangler.jsonc 的 custom domain route 必须是纯 hostname')
  for (const name of ['CF_ACCESS_TEAM_DOMAIN', 'CF_ACCESS_AUD', 'TOTEM_ALLOWED_EMAIL_DOMAIN', 'TOTEM_IDENTITY_URL']) {
    if (!vars[name] || placeholders.test(String(vars[name]))) errors.push(`wrangler.jsonc vars.${name} 未填写`)
  }
  const secretFields = findSecretFields(app)
  if (secretFields.length) errors.push(`wrangler.jsonc 不能保存 secret 字段：${secretFields.join(', ')}`)
}

if (identity) {
  const db = identity.d1_databases?.find((item) => item?.binding === 'DB')
  if (!identity.name) errors.push('Identity Worker name 未填写')
  if (!db?.database_name) errors.push('Identity Worker 缺少 D1 database_name')
  if (!/^[a-f0-9-]{36}$/i.test(db?.database_id ?? '')) errors.push('Identity Worker 的 D1 database_id 格式不正确')
  const secretFields = findSecretFields(identity)
  if (secretFields.length) errors.push(`Identity Worker config 不能保存 secret 字段：${secretFields.join(', ')}`)
}

if (app?.name && identity?.name && app.name === identity.name) errors.push('App Worker 和 Identity Worker 不能同名')

if (errors.length) {
  console.error('Builder 配置检查失败：')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Builder 配置检查通过。')
for (const warning of warnings) console.log(`注意：${warning}`)
console.log(`App Worker: ${app.name}`)
const appHostname = app.routes?.find((item) => item?.custom_domain)?.pattern
if (appHostname) console.log(`App hostname: ${appHostname}`)
console.log(`Identity Worker: ${identity.name}`)
console.log(`D1: ${identity.d1_databases.find((item) => item?.binding === 'DB').database_name}`)
console.log('Secret 值只从 .env 读取，没有写入 Cloudflare 配置。')
