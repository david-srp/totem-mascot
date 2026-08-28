import { createZooclawClient } from '@zooclaw-agents/sdk'
const zc = createZooclawClient()
const o = await zc.exec(process.env.IP_AGENT_ID, ['bash','-lc',
  'echo "--- /tmp/openclaw/designer 最近 10 分钟 ---"; find /tmp/openclaw/designer -newermt "-10 minutes" -type f 2>/dev/null | wc -l; ls -lat /tmp/openclaw/designer 2>/dev/null | head -8'])
console.log(o.stdout)
