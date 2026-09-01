// 主题三态（system / light / dark）。首帧前的同步应用在 app.html 的内联脚本里，
// 这里只负责切换与持久化，localStorage 键与静态页共用。
import { useSyncExternalStore } from 'react'

export type Theme = 'system' | 'light' | 'dark'
const KEY = 'totem-theme'

function initialTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

let theme: Theme = initialTheme()
const listeners = new Set<() => void>()

function apply(v: Theme) {
  const html = document.documentElement
  if (v === 'system') delete html.dataset.theme
  else html.dataset.theme = v
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])')
  if (meta) meta.content = getComputedStyle(html).getPropertyValue('--paper').trim()
}

export function cycleTheme() {
  const order: Theme[] = ['system', 'light', 'dark']
  theme = order[(order.indexOf(theme) + 1) % 3]
  try { localStorage.setItem(KEY, theme) } catch { /* 忽略 */ }
  apply(theme)
  listeners.forEach((fn) => fn())
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      // 跟随系统时，系统亮暗切换也要触发重渲染（按钮文字不变，但保持行为一致）
      const mq = matchMedia('(prefers-color-scheme: dark)')
      const onSys = () => { if (theme === 'system') fn() }
      mq.addEventListener('change', onSys)
      return () => { listeners.delete(fn); mq.removeEventListener('change', onSys) }
    },
    () => theme,
  )
}
