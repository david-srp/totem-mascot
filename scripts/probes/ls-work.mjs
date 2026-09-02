import { createZooworkClient } from '@zoowork-ai/sdk'
const zc = createZooworkClient()
const o = await zc.exec(process.env.IP_AGENT_ID, ['bash','-lc','ls -la /workspace/logos/*/ 2>/dev/null | tail -30'])
console.log(o.stdout || '(空)')
