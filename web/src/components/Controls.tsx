// 主题三态 + 中英切换。样式类名沿用 tokens.css 里的 .ctl / .seg。
import { setLang, tr, useLang } from '../i18n'
import { cycleTheme, useTheme } from '../theme'

export function Controls() {
  const lang = useLang()
  const theme = useTheme()
  return (
    <div className="ctl">
      <div className="seg">
        <button
          type="button"
          aria-pressed={theme !== 'system'}
          title={tr('ctl.themeTip')}
          onClick={cycleTheme}
        >{tr(theme === 'system' ? 'ctl.auto' : theme === 'light' ? 'ctl.light' : 'ctl.dark')}</button>
      </div>
      <div className="seg lang">
        <button type="button" aria-pressed={lang === 'zh'} title={tr('ctl.langTip')} onClick={() => setLang('zh')}>中</button>
        <button type="button" aria-pressed={lang === 'en'} title={tr('ctl.langTip')} onClick={() => setLang('en')}>EN</button>
      </div>
    </div>
  )
}
