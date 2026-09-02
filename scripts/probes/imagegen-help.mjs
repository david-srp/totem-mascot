import { createZooworkClient } from '@zoowork-ai/sdk'
const zc = createZooworkClient()
const out = await zc.exec(process.env.IP_AGENT_ID, ['bash','-lc',
  `cd /workspace && uv run --with litellm,aiohttp,Pillow,openai /skills/designer/scripts/image_generation_cli.py --help 2>&1 | head -60`])
console.log('exit:', out.exit_code)
console.log(out.stdout || out.stderr)
