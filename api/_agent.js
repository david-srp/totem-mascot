// 每用户一个 Agent。Identity 通过内容 hash lazy sync；Skill 安装一次后自动跟随 latest。
import { ZooworkError } from '@zoowork-ai/sdk'
import { zc } from './_zc.js'
import { bindAgent, recordIdentityHash } from './_identity.js'
import { APP, MODEL_PREF, SKILL_NAME, agentResource, idemKeyFor, identityDefinition } from '../ip-as-logo/agent-def.mjs'

const agentCache = new Map()
let modelP = null
let skillP = null

function pickModel() {
  modelP ??= zc.listModels().then((models) => {
    const m = models.find((x) => x.model === MODEL_PREF)?.model ?? models[0]?.model
    if (!m) throw new Error('这个 key 名下没有可用模型')
    return m
  }).catch((e) => { modelP = null; throw e })
  return modelP
}

function sharedSkillId() {
  skillP ??= zc.listSkills({ q: SKILL_NAME }).then((rows) => {
    const owned = rows.filter((s) => s.scope === 'org' && s.name === SKILL_NAME)
    if (owned.length !== 1) {
      throw new Error(`技能 ${SKILL_NAME} 应该恰好有一条自有记录，当前是 ${owned.length} 条`)
    }
    return owned[0].skill_id
  }).catch((e) => { skillP = null; throw e })
  return skillP
}

async function syncIdentity(identity, agentId) {
  const desired = await identityDefinition()
  if (identity.identityHash === desired.hash) return agentId
  await zc.updateAgent(agentId, {
    persona: { docs: [desired.doc] },
  })
  await recordIdentityHash(identity.userId, desired.hash)
  identity.identityHash = desired.hash
  return agentId
}

async function validateBoundAgent(agentId) {
  try {
    const agent = await zc.getAgent(agentId)
    if (agent.status?.desired_state !== 'running') {
      await zc.startAgent(agentId)
      await zc.waitUntilRunning(agentId, { timeoutMs: 45_000 })
    }
    return true
  } catch (e) {
    // 切换 ZooWork organization/key 后，D1 可能仍保存旧环境的 Agent ID。
    // 404 只说明当前 key 看不到它；回到 labels 恢复或创建路径并覆盖 binding。
    if (e instanceof ZooworkError && e.status === 404) return false
    throw e
  }
}

/** 只查不建。优先使用 D1 binding；没有 binding 时兼容按旧 label 找回并登记。 */
export async function findAgent(identity) {
  const uid = identity.userId
  const cached = agentCache.get(uid)
  if (cached) return syncIdentity(identity, cached)
  let id = identity.agentId || null
  if (id && !(await validateBoundAgent(id))) {
    id = null
    identity.agentId = null
    identity.identityHash = null
  }
  if (!id) {
    const rows = await zc.listAgents({ labels: { app: APP, user: uid } })
    id = rows[0]?.agent_id ?? null
    if (id) {
      await validateBoundAgent(id)
      const desired = await identityDefinition()
      await zc.updateAgent(id, { persona: { docs: [desired.doc] } })
      await bindAgent(uid, id, desired.hash)
      identity.agentId = id
      identity.identityHash = desired.hash
    }
  }
  if (!id) return null
  agentCache.set(uid, id)
  return syncIdentity(identity, id)
}

/** 查到就用；查不到就创建、启动，并把 user → Agent binding 写入 D1。 */
export async function ensureAgent(identity) {
  const existing = await findAgent(identity)
  if (existing) return existing
  const uid = identity.userId
  const [model, skillId, desired] = await Promise.all([pickModel(), sharedSkillId(), identityDefinition()])
  const created = await zc.createAgent({ resource: agentResource(uid, model, skillId, desired) }, idemKeyFor(uid))
  const id = created.agent_id
  await zc.startAgent(id)
  await zc.waitUntilRunning(id, { timeoutMs: 45_000 })
  const attached = await zc.listAgentSkills(id)
  if (!attached.some((skill) => skill.skill_id === skillId && skill.eligible !== false)) {
    throw new Error(`技能 ${SKILL_NAME} 没有正确安装到新 Agent`)
  }
  await bindAgent(uid, id, desired.hash)
  identity.agentId = id
  identity.identityHash = desired.hash
  agentCache.set(uid, id)
  return id
}
