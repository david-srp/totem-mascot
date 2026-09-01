import { createZooworkClient } from '@zoowork-ai/sdk'
const zc = createZooworkClient()
const A = process.env.IP_AGENT_ID
const out = await zc.exec(A, ['bash','-lc',
  `ls -la /skills/designer/ ; echo "--- scripts ---" ; ls -la /skills/designer/scripts/ 2>&1 | head
   echo "--- decision-rules C2 (quality) ---"
   sed -n '/C2/,/C3/p' /skills/designer/references/decision-rules.md | head -30`])
console.log(out.stdout); if (out.exit_code) console.error('STDERR:', out.stderr)
