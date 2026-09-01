// 只打印环境变量的【名字】和长度，绝不打印值。
import { createZooworkClient } from '@zoowork-ai/sdk'
const zc = createZooworkClient()
const AGENT_ID = process.env.IP_AGENT_ID

const out = await zc.exec(AGENT_ID, ['bash', '-lc',
  `echo "--- 内置技能相关环境变量（只显示名字与长度）---"
   env | grep -iE 'token|key|secret|credential|gateway|api' | while IFS='=' read -r k v; do
     printf "%-42s len=%s\\n" "$k" "\${#v}"
   done | sort
   echo
   echo "--- /skills 目录 ---"
   ls /skills 2>/dev/null | tr '\\n' ' '
   echo
   echo
   echo "--- designer 技能是否落盘 ---"
   ls -la /skills/designer/ 2>&1 | head -8
   echo
   echo "--- ip-as-logo 技能是否落盘 ---"
   ls -la /skills/ip-as-logo/ 2>&1 | head -8`
])
console.log('exit_code:', out.exit_code)
if (out.exit_code !== 0) console.error('stderr:', out.stderr)
console.log(out.stdout)
