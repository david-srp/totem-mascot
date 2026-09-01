// Builder 维护的 Agent Definition。当前样板只抽象两部分：
// 1. identity：一份简短、稳定的 AGENTS.md；
// 2. skill：所有用户 Agent 共同安装、自动跟随 latest 的 org Skill。
// model、labels 和 sandbox scope 是应用运行时配置，不进入 Definition 的分发模型。
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const APP = 'ip-as-logo'
export const SKILL_NAME = 'ip-as-logo'

/** 首选模型；不在目录里时退回到 listModels() 的第一个 */
export const MODEL_PREF = 'litellm/claude-sonnet-5'

/** 每用户 agent 的标签。listAgents({ labels }) 按它收敛，一个 uid 只会有一个 agent。 */
export const labelsFor = (uid) => ({ app: APP, user: uid })

/** 幂等键：同一个 uid 重复创建只会得到同一个 agent */
export const idemKeyFor = (uid) => `${APP}-user-${uid}`

export const agentNameFor = (uid) => `${APP}-${uid.slice(0, 12)}`

/** Identity 全文。部署 bundle 里 cwd 不同的时候，退回按模块位置找。 */
export async function identityText() {
  try {
    return await readFile(path.join(process.cwd(), 'ip-as-logo/agents/AGENTS.md'), 'utf8')
  } catch (fileError) {
    try {
      // Wrangler 通过 Text rule 把同一个 Markdown source 内嵌进 Worker bundle。
      return (await import('./agents/AGENTS.md')).default
    } catch {
      throw fileError
    }
  }
}

/**
 * Identity 的内容 hash。它由真实内容计算，不要求 Builder 手工维护版本号。
 * D1 只用它判断某个用户 Agent 是否需要 lazy sync。
 */
export async function identityDefinition() {
  const content = await identityText()
  const doc = { name: 'AGENTS.md', content }
  const hash = createHash('sha256').update(JSON.stringify(doc)).digest('hex')
  return { doc, hash }
}

/** createAgent 的 resource。Skill 在创建时直接以 unpinned latest 安装。 */
export function agentResource(uid, model, skillId, identity) {
  return {
    name: agentNameFor(uid),
    model: { primary: model },
    persona: { docs: [identity.doc] },
    skills: [{ skill_id: skillId }],
    labels: labelsFor(uid),
    sandbox: { scope: 'agent' },
  }
}
