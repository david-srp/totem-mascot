import { createZooclawClient } from '@zooclaw-agents/sdk'
const zc = createZooclawClient()
const o = await zc.exec(process.env.IP_AGENT_ID, ['bash','-lc',
  'ls -la /workspace/logos/cold-brew-coffee/ 2>&1; echo "--- 运行中的生图进程 ---"; ps aux | grep -c "[i]mage_generation_cli"'])
console.log(o.stdout)
