// 把 ip-as-logo/skills/ 发布为 org Skill。
// 第一次创建 Skill；之后每次运行发布新版本。所有 unpinned 用户 Agent 自动跟随 latest。
import { createHash } from 'node:crypto'
import { readFile, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createZooclawClient } from '@zooclaw-agents/sdk'
import { SKILL_NAME } from '../ip-as-logo/agent-def.mjs'

const run = promisify(execFile)
const zc = createZooclawClient()

const SKILLS_DIR = path.resolve(import.meta.dirname, '../ip-as-logo/skills')
const ZIP_DIR = path.resolve(import.meta.dirname, '../.build/skill-zips')
await mkdir(ZIP_DIR, { recursive: true })
const zipPath = path.join(ZIP_DIR, `${SKILL_NAME}.zip`)
await rm(zipPath, { force: true })
// 归档写在被打包目录之外，避免自包含；顶层目录名 = SKILL.md frontmatter 的 name
await run('zip', ['-q', '-r', '-X', zipPath, SKILL_NAME], { cwd: SKILLS_DIR })
const zipBuf = await readFile(zipPath)
console.log('zip:', zipPath, `(${zipBuf.length} bytes)`)

const owned = (await zc.listSkills({ q: SKILL_NAME })).filter((s) => s.scope === 'org' && s.name === SKILL_NAME)
if (owned.length > 1) throw new Error(`expected at most 1 owned skill row, saw ${owned.length}: ${owned.map((s) => s.skill_id).join(',')}`)

const contentHash = createHash('sha256').update(zipBuf).digest('hex')
const idempotencyKey = `${SKILL_NAME}-${contentHash}`
const uploaded = owned.length === 0
  ? await zc.uploadSkill(zipBuf, {
      scope: 'org',
      fileName: `${SKILL_NAME}.zip`,
      idempotencyKey,
    })
  : await zc.uploadSkillVersion(owned[0].skill_id, zipBuf, {
      fileName: `${SKILL_NAME}.zip`,
      idempotencyKey,
    })

console.log(owned.length === 0 ? 'created:' : 'published:', uploaded.skill_id, uploaded.name, 'v' + uploaded.latest_version)

const verified = (await zc.listSkills({ q: SKILL_NAME })).filter((s) => s.scope === 'org' && s.name === SKILL_NAME)
if (verified.length !== 1) throw new Error(`expected 1 owned skill row, saw ${verified.length}`)
console.log('verify ok. SKILL_ID=' + verified[0].skill_id + ' latest=' + verified[0].latest_version)
