/* 线上逐会话验证：拉 history + artifacts，用与前端相同的规则算残留 */
const B = 'https://totem.impo.ai'
const IMG = /https?:\/\/[^\s)<>"'）】，。]+?\.(?:png|jpe?g|webp|gif|avif)/gi
const ids = process.argv.slice(2)
for (const id of ids) {
  const [H, A] = await Promise.all([
    fetch(`${B}/api/history?session=${id}`).then(r=>r.json()),
    fetch(`${B}/api/artifacts?session=${id}`).then(r=>r.json()),
  ])
  const byFile = {}; for (const a of A.artifacts) byFile[a.fileName] = a
  let urlsLeft = 0, mediaLeft = 0, imgsShown = 0
  for (const t of H.turns) {
    const hasManifest = /```ipal-manifest[\s\S]*?"phase"\s*:\s*"candidates"/.test(t.reply||'')
    const hasPaths = /\/workspace\/logos\/[^\s]+\.(png|jpg)/.test(t.reply||'')
    const inline = [...String(t.reply||'').matchAll(IMG)].map(m=>m[0])
    const media = (t.media||[]).length
    const willShow = hasManifest || hasPaths || inline.length || media
    if (willShow) { imgsShown += Math.max(inline.length, media); }
    else { urlsLeft += inline.length }
    if (!willShow) mediaLeft += ((t.reply||'').match(/^MEDIA/gm)||[]).length
  }
  console.log(`  ${id.slice(0,10)}  轮次 ${String(H.turns.length).padStart(2)} | 会被渲染成图 ${String(imgsShown).padStart(2)} | 无法处理而残留 ${urlsLeft + mediaLeft}`)
}
