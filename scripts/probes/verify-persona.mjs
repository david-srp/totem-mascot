import { createZooclawClient } from '@zooclaw-agents/sdk'
const zc = createZooclawClient()
const a = await zc.getAgent(process.env.IP_AGENT_ID)
const p = a.declared?.persona?.docs?.[0]?.content ?? ''
for (const [k,s] of [
  ['artifact 强制发布', '你有这个工具'],
  ['自动重试', '判废后自动重试一次（不要停下来问）'],
  ['四角补丁', 'Corners: fill all four corners'],
  ['裁切补丁', 'Cropping: the mascot must run off the bottom edge'],
  ['retryOf 字段', '"retryOf"'],
]) console.log((p.includes(s) ? '  ✓ ' : '  ✗ ') + k)
