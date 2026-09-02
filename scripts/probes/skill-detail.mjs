import { createZooworkClient } from '@zoowork-ai/sdk'
const zc = createZooworkClient()
const want = ['designer', 'chameleon-seedance', 'video-generator', 'web-designer', 'frontend-design']
const all = await zc.listSkills()
for (const name of want) {
  const s = all.find((x) => x.name === name)
  if (!s) { console.log(`\n### ${name}: NOT FOUND`); continue }
  console.log(`\n### ${name}  (${s.skill_id}, scope=${s.scope}, v${s.latest_version})`)
  console.log('description:', s.description ?? '(none)')
  const keys = Object.keys(s).filter(k => !['name','skill_id','scope','latest_version','description'].includes(k))
  if (keys.length) console.log('other fields:', JSON.stringify(Object.fromEntries(keys.map(k=>[k,s[k]]))).slice(0,600))
}
