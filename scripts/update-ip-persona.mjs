import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createZooclawClient } from '@zooclaw-agents/sdk'
const zc = createZooclawClient()
const A = process.env.IP_AGENT_ID
const persona = await readFile(path.resolve(import.meta.dirname, '../ip-as-logo/agents/AGENTS.md'), 'utf8')

await zc.updateAgent(A, { persona: { docs: [{ name: 'AGENTS.md', content: persona }] } })
const after = await zc.getAgent(A)
const got = after.declared?.persona?.docs?.[0]?.content ?? ''
console.log('config_version:', after.status?.config_version)
console.log('persona chars on server:', got.length, '| local:', persona.length)
console.log('包含 gpt-image-2:', got.includes('gpt-image-2'))
console.log('包含 禁用 image_generate:', got.includes('绝不使用 `image_generate` 工具'))
console.log('模型:', after.declared?.model?.primary)
if (!got.includes('gpt-image-2')) throw new Error('persona 未更新')
