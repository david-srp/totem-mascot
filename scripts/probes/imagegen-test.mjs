import { createZooworkClient } from '@zoowork-ai/sdk'
const zc = createZooworkClient()
const PROMPT = `Create one complete full-bleed 1:1 square IP mascot logo artwork.
Backdrop: cover the entire canvas with one visible, fully opaque solid deep navy. Keep deep navy clearly visible in all four square corners and every open area surrounding the mascot.
Subject: place one highly simplified round-headed owl mascot over the backdrop, reduced to one rounded continuous silhouette and one defining feature.
Complexity: use 6-10 broad basic shapes, at most two broad internal color regions, and a face with two eyes and one mouth. Keep the symbol readable at 32 x 32.
Color behavior: use exactly three semantic colors in the complete artwork: exactly two IP base colors plus the backdrop color. Choose the two IP colors from the subject and context, organize both into broad purposeful masses, and reuse them for facial marks. Keep the IP, facial marks, and backdrop clearly separated.
Composition: keep the mascot upright, emerging from the lower-left, filling 75-85% of the square, with both paired identifying features visible.
Style: use an ultra-clean Flat-first logo treatment with minimal graphic masses and only 8-12% extremely subtle internal tonal modeling inside the IP; barely neo-skeuomorphic, thick, soft, restrained, and scalable. Keep the result mostly flat.
Finish: show only the mascot over the full-canvas backdrop, with clean geometric surfaces and normal square outer corners.
Constraints: Use no text or watermark. Add no borders, frames, cards, or App-icon masks. Include one mascot only, with no extra subjects or scenery. Keep the contours thick and rounded, without fragile lines or sharp tips. Add no photorealistic material, dramatic bevel, glossy hotspot, deep occlusion, extrusion, strong three-dimensional rendering, or external cast shadow. Keep the background flat, with no gradient, texture, vignette, or lighting variation.`

const t0 = Date.now()
const out = await zc.exec(process.env.IP_AGENT_ID, ['bash','-lc',
  `mkdir -p /workspace/logos/probe && cd /workspace/logos/probe && \
   uv run --with litellm,aiohttp,Pillow,openai /skills/designer/scripts/image_generation_cli.py \
     --prompt ${JSON.stringify(PROMPT)} \
     --model gpt-image-2 --quality medium --size 1536x1536 --n 1 2>&1 | tail -20
   echo "--- 落盘产物 ---"
   find /workspace /tmp -newermt '-5 minutes' -type f \\( -name '*.png' -o -name '*.jpg' -o -name '*.webp' \\) 2>/dev/null | head -10 | while read f; do
     echo "$f  $(stat -c %s "$f") bytes"
   done`])
console.log(`exec ${((Date.now()-t0)/1000).toFixed(0)}s  exit=${out.exit_code}`)
console.log(out.stdout)
if (out.stderr) console.error('STDERR:', out.stderr.slice(0, 1000))
