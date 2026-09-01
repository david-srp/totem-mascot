// 极简 markdown 渲染，从旧版 app.html 逐函数移植。
// 输出的是已转义的 HTML 字符串（esc 在 inl 之前跑），配 dangerouslySetInnerHTML 使用。

/** 兜底：后端若送来内容块数组或对象，也还原成文本，绝不让 [object Object] 出现在界面上 */
export const plain = (v: unknown): string =>
  typeof v === 'string' ? v
  : Array.isArray(v) ? v.map((x) => typeof x === 'string' ? x : (x && typeof (x as { text?: unknown }).text === 'string' ? (x as { text: string }).text : '')).filter(Boolean).join('')
  : (v && typeof (v as { text?: unknown }).text === 'string') ? (v as { text: string }).text
  : v == null ? '' : String(v)

export const esc = (s: unknown): string =>
  plain(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))

/** 正文里的裸图片链接。渲染时会被抽成缩略图条，所以 md() 需要知道哪些要从文本里删掉 */
export const IMG_URL = /https?:\/\/[^\s)<>"'）】，。]+?\.(?:png|jpe?g|webp|gif|avif)/gi

const inl = (s: string): string => esc(s)
  .replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, '<img src="$2" alt="$1">')
  .replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

/** 简易 markdown 表格：首行表头，第二行分隔，其余为数据行 */
function table(block: string): string {
  const rows = block.split('\n').map((r) => r.trim()).filter((r) => r.startsWith('|'))
  if (rows.length < 2) return '<p>' + inl(block) + '</p>'
  const cells = (r: string) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
  const head = cells(rows[0])
  const body = rows.slice(2).map(cells).filter((r) => r.some((c) => c))
  return '<div class="tblwrap"><table><thead><tr>' +
    head.map((c) => '<th>' + inl(c) + '</th>').join('') + '</tr></thead><tbody>' +
    body.map((r) => '<tr>' + r.map((c) => '<td>' + inl(c) + '</td>').join('') + '</tr>').join('') +
    '</tbody></table></div>'
}

/**
 * 渲染 agent 回复。drop 是已经在缩略图条里显示过的图片 URL 集合，
 * 这些 URL 所在的行要清理掉，避免同一张图出现两遍。
 */
export function md(src: unknown, drop?: Set<string>): string {
  let s = String(src ?? '').replace(/```ipal-manifest[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '')
  // MEDIA:xxx 是投递标记不是给人看的内容。指向 http 的图会被渲染成缩略图，
  // 指向沙箱临时路径的（早先失败投递留下的）用户根本打不开，两种都整行丢掉。
  s = s.replace(/^[ \t]*MEDIA[ \t]*[:：][ \t]*\S+[ \t]*$/gim, '')
  if (drop && drop.size) {
    // 只清理真的被抽掉链接的那一行，别误伤正常内容
    s = s.split('\n').map((line) => {
      let hit = false
      const out = line.replace(new RegExp(IMG_URL.source, 'gi'), (u) => { if (drop.has(u)) { hit = true; return '' } return u })
      if (!hit) return line
      const cleaned = out.replace(/[\s—–:：、，,·-]+$/, '')                       // 行尾孤立的分隔符
      if (/^[\s]*(?:[-*]|\d+[.、)])?[\s]*$/.test(cleaned)) return ''              // 整行只剩序号
      if (/^\s*(?:MEDIA|IMAGE|IMG|图片|附件|预览|图)\s*$/i.test(cleaned)) return '' // 只剩 MEDIA 这种标签
      return cleaned
    }).join('\n')
  }
  return s
    .split(/\n{2,}/).map((b) => {
      b = b.trim()
      if (!b) return ''
      if (/^#{1,6}\s/.test(b)) return '<h4>' + inl(b.replace(/^#+\s*/, '')) + '</h4>'
      if (/^([-*+]|\d+\.)\s/.test(b)) {
        const o = /^\d+\./.test(b)
        const li = b.split('\n').filter((l) => l.trim()).map((l) => '<li>' + inl(l.replace(/^\s*([-*+]|\d+\.)\s*/, '')) + '</li>').join('')
        return o ? '<ol>' + li + '</ol>' : '<ul>' + li + '</ul>'
      }
      if (/^\|/.test(b) && /\n\s*\|[\s:|-]+\|/.test(b)) return table(b)
      if (/^---+$/.test(b)) return '<hr>'
      return '<p>' + inl(b).replace(/\n/g, '<br>') + '</p>'
    }).join('')
}
