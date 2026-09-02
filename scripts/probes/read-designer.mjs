import { createZooworkClient } from '@zoowork-ai/sdk'
const zc = createZooworkClient()
const out = await zc.exec(process.env.IP_AGENT_ID, ['bash','-lc',
  `grep -n -iE "gpt-image|model|quality|size|resolution|medium|high|low" /skills/designer/SKILL.md | head -60
   echo "=========== references ==========="
   ls /skills/designer/references/`])
console.log(out.stdout); if(out.exit_code!==0) console.error(out.stderr)
