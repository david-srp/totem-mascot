// 按 references/deploy-your-agent.md 的步骤顺序执行，每步都做它要求的 verify。
// 关键：全程不碰 exec —— 第一个触碰沙箱的必须是会话（Step 6），不是 exec。
import { readFile, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createZooclawClient, assistantText, isRunFinished, runOutcome, toolCall, ZooclawError } from '@zooclaw-agents/sdk'

const run = promisify(execFile)
const zc = createZooclawClient()
const ROOT = path.resolve(import.meta.dirname, '../ip-as-logo')
const LABELS = { app: 'ip-as-logo', env: 'prod' }
const SKILL_NAME = 'ip-as-logo'

// ---------- Step 1. model ----------
const models = await zc.listModels()
const model = models.find((m) => m.model === 'litellm/claude-sonnet-5')?.model ?? models[0]?.model
if (!model) throw new Error('no models available to this key')
console.log('[1] model:', model)

// ---------- Step 2. create (converge on ONE agent) ----------
const existing = await zc.listAgents({ labels: LABELS })
let agentId = existing[0]?.agent_id
if (agentId) {
  console.log('[2] reusing existing agent:', agentId)
} else {
  const persona = await readFile(path.join(ROOT, 'agents/AGENTS.md'), 'utf8')
  const created = await zc.createAgent(
    {
      resource: {
        name: 'ip-as-logo',
        model: { primary: model },
        persona: { docs: [{ name: 'AGENTS.md', content: persona }] },
        labels: LABELS,
        sandbox: { scope: 'agent' },
        // 注意：不传 warm（0.1.0 已删除，正是它 race 掉了内置技能的凭证注入）
        // 也不传 onboarding（SDK 现在恒发 false）
      },
    },
    'ip-as-logo-prod-v1', // 稳定幂等键，不是 per-deploy uuid
  )
  agentId = created.agent_id
  console.log('[2] created agent:', agentId, 'config_version:', created.config_version)
}

// verify: 读回来的是 projection，配置在 declared 下
const agent = await zc.getAgent(agentId)
const personaLen = agent.declared?.persona?.docs?.[0]?.content?.length ?? 0
console.log('[2] verify: config_version =', agent.status?.config_version, '| persona doc chars =', personaLen)
if (!personaLen) throw new Error('persona did not land on the agent')

// ---------- Step 3. start + wait on desired_state ----------
const { warnings } = await zc.startAgent(agentId)
if (warnings?.length) console.log('[3] start warnings (channel_routes_reload_failed 对纯 API agent 属正常):', warnings)
const running = await zc.waitUntilRunning(agentId, { timeoutMs: 90_000 })
console.log('[3] verify: desired_state =', running.status?.desired_state)
if (running.status?.desired_state !== 'running') throw new Error('agent is not running')

// ---------- Step 4. zip + upload skill ----------
const SKILLS_DIR = path.join(ROOT, 'skills')
const ZIP_DIR = path.resolve(import.meta.dirname, '../.build/skill-zips')
await mkdir(ZIP_DIR, { recursive: true })
const zipPath = path.join(ZIP_DIR, `${SKILL_NAME}.zip`)
await rm(zipPath, { force: true })
// 归档写在被打包目录之外，避免自包含；顶层目录名 = SKILL.md frontmatter 的 name
await run('zip', ['-q', '-r', '-X', zipPath, SKILL_NAME], { cwd: SKILLS_DIR })
const zipBuf = await readFile(zipPath)
console.log('[4] zip:', zipPath, `(${zipBuf.length} bytes)`)

const uploaded = await zc.uploadSkill(zipBuf, {
  scope: 'org',
  fileName: `${SKILL_NAME}.zip`,
  idempotencyKey: `${SKILL_NAME}-v1`,
})
console.log('[4] uploaded:', uploaded.skill_id, uploaded.name, 'v' + uploaded.latest_version)

// verify: 恰好一行自有 skill，且版本已创建
const owned = (await zc.listSkills({ q: SKILL_NAME })).filter((s) => s.scope === 'org' || s.scope === 'personal')
console.log('[4] verify: owned rows =', owned.length, '| latest_version =', Number(uploaded.latest_version))
if (owned.length !== 1) throw new Error(`expected 1 owned skill row, saw ${owned.length}: ${owned.map(s=>s.skill_id).join(',')}`)

// ---------- Step 5. attach + prove it resolved ----------
await zc.putAgentSkill(agentId, uploaded.skill_id)
const attached = await zc.listAgentSkills(agentId)
const row = attached.find((s) => s.skill_id === uploaded.skill_id)
if (!row) throw new Error('skill did not resolve onto the agent')
if (row.eligible === false) throw new Error(`attached but ineligible: ${JSON.stringify(row)}`)
console.log('[5] verify: attached', row.name, 'v' + row.version, '| eligible =', row.eligible, '| location =', row.location)

// designer 是全局技能，应当已自动挂载
const designer = attached.find((s) => s.name === 'designer')
console.log('[5] designer (global 图像生成):', designer ? `present, eligible=${designer.eligible}, ${designer.location}` : 'NOT PRESENT ⚠️')

console.log('\n=== 部署完成 ===')
console.log('AGENT_ID=' + agentId)
console.log('SKILL_ID=' + uploaded.skill_id)
console.log('SKILL_LOCATION=' + row.location)
