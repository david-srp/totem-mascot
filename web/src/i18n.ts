// 工作台文案。中文是默认值，英文覆盖；键名与旧版 i18n.js 的 app 段保持一致。
// localStorage 键与静态页（site.js）共用，两边切换互通。
import { useSyncExternalStore } from 'react'

export type Lang = 'zh' | 'en'
const KEY = 'totem-lang'

const ZH: Record<string, string> = {
  brand: '图腾',
  't.app': '图腾 Totem · 工作台',
  'a.new': '＋ 新建项目', 'a.mine': '我的项目', 'a.home': '回到首页', 'a.guide': '怎么做的',
  'a.blankh': '建一个项目开始吧',
  'a.blankp': '说一句你的产品是做什么的，它会先给你三个方向，你点头之后再动笔画。',
  'a.works': '成品', 'a.dirs': '三个方向', 'a.mini': '缩到 App 图标大小', 'a.all': '全部图',
  'a.ph': '接着说点什么…',
  'a.mtitle': '新建项目', 'a.msub': '一个项目就是一次完整的设计委托。',
  'a.mname': '项目叫什么', 'a.mnameph': '比如：冷萃咖啡吉祥物',
  'a.mwhat': '你的产品是做什么的',
  'a.mwhatph': '它做什么、给谁用、想给人什么感觉。一句话就够，也可以留空之后再说。',
  'a.cancel': '取消', 'a.create': '建好开始',
  ready: '就绪', loading: '载入中', drawing: '画着呢', done: '画好了', slow: '等太久了',
  failopen: '打不开', failsend: '没发出去', netbad: '网络开小差了', oops: '出了点问题',
  recommend: '推荐', redone: '已重画', nearly: '还差点', redoV: '重画版',
  download: '下载高清图', drawingShort: '画着呢', viewAll: '查看全部 {n} 张', count: '{n} 张',
  pTidy: '正在整理成品', pCheck: '正在检查第 {n} 张', pDraw: '正在画第 {n} 张', pThink: '正在构思', pIdle: '正在思考',
  noProj: '还没有项目', nameIt: '给项目起个名字吧', removeQ: '移除这个项目？', remove: '移除', errPrefix: '出了点问题：',
  justNow: '刚刚', minAgo: '{n} 分钟前', hrAgo: '{n} 小时前', dayAgo: '{n} 天前',
  q1: '可以，就画这三个方向', q2: '我想再看几个别的方向', q3: '第一个再画几张变化', q4: '先给我三个方向看看',
  proj: '项目',
  'ctl.auto': '自动', 'ctl.light': '亮', 'ctl.dark': '暗',
  'ctl.themeTip': '点一下切换外观', 'ctl.langTip': '切换语言',
}

const EN: Record<string, string> = {
  brand: 'Totem',
  't.app': 'Totem · Workspace',
  'a.new': '＋ New project', 'a.mine': 'My projects', 'a.home': 'Home', 'a.guide': 'How it was made',
  'a.blankh': 'Start with a project',
  'a.blankp': 'Say what your product does in one line. You get three directions first, and it only starts drawing once you agree.',
  'a.works': 'Results', 'a.dirs': 'Three directions', 'a.mini': 'At app-icon size', 'a.all': 'Everything',
  'a.ph': 'Say something…',
  'a.mtitle': 'New project', 'a.msub': 'One project is one complete design commission.',
  'a.mname': 'Project name', 'a.mnameph': 'e.g. Cold brew mascot',
  'a.mwhat': 'What does your product do',
  'a.mwhatph': 'What it does, who it is for, how it should feel. One sentence is enough, or leave it blank and tell it later.',
  'a.cancel': 'Cancel', 'a.create': 'Create and start',
  ready: 'Ready', loading: 'Loading', drawing: 'Drawing', done: 'Done', slow: 'Took too long',
  failopen: 'Could not open', failsend: 'Not sent', netbad: 'Network hiccup', oops: 'Something went wrong',
  recommend: 'Recommended', redone: 'Redrawn', nearly: 'Not quite', redoV: 'Redraw',
  download: 'Download full size', drawingShort: 'Drawing', viewAll: 'See all {n}', count: '{n} images',
  pTidy: 'Publishing the results', pCheck: 'Checking image {n}', pDraw: 'Drawing image {n}',
  pThink: 'Thinking it through', pIdle: 'Thinking',
  noProj: 'No projects yet', nameIt: 'Give the project a name', removeQ: 'Remove this project?', remove: 'Remove',
  errPrefix: 'Something went wrong: ',
  justNow: 'just now', minAgo: '{n} min ago', hrAgo: '{n} h ago', dayAgo: '{n} d ago',
  q1: 'Looks good, draw these three', q2: 'Show me some other directions',
  q3: 'More variations of the first one', q4: 'Give me three directions first',
  proj: 'Project',
  'ctl.auto': 'Auto', 'ctl.light': 'Light', 'ctl.dark': 'Dark',
  'ctl.themeTip': 'Click to change appearance', 'ctl.langTip': 'Switch language',
}

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'zh' || saved === 'en') return saved
    const locale = (navigator.languages?.[0] || navigator.language || 'zh').toLowerCase()
    const simplifiedChinese = locale.startsWith('zh')
      && !locale.includes('hant')
      && !/^zh-(tw|hk|mo)\b/.test(locale)
    return simplifiedChinese ? 'zh' : 'en'
  } catch {
    return 'zh'
  }
}

let lang: Lang = initialLang()
const listeners = new Set<() => void>()

export function setLang(next: Lang) {
  if (next === lang) return
  lang = next
  try { localStorage.setItem(KEY, next) } catch { /* 隐私模式下没有 localStorage，不影响使用 */ }
  document.documentElement.dataset.lang = next
  document.documentElement.lang = next
  listeners.forEach((fn) => fn())
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => listeners.delete(fn) },
    () => lang,
  )
}

/** 取文案。vars 里的值替换文案中的 {key} 占位符。 */
export function tr(k: string, vars?: Record<string, string | number>): string {
  let s = (lang === 'en' ? EN[k] : undefined) ?? ZH[k] ?? k
  if (vars) for (const key in vars) s = s.split('{' + key + '}').join(String(vars[key]))
  return s
}
