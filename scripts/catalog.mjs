import { createZooclawClient } from '@zooclaw-agents/sdk'
const zc = createZooclawClient()
const skills = await zc.listSkills()
console.log('total skills:', skills.length)
const byScope = {}
for (const s of skills) (byScope[s.scope] ??= []).push(s)
for (const [scope, arr] of Object.entries(byScope)) {
  console.log(`\n--- scope=${scope} (${arr.length}) ---`)
  for (const s of arr) console.log(`  ${(s.name ?? '?').padEnd(34)} ${s.skill_id}  v${s.latest_version ?? '?'}`)
}
