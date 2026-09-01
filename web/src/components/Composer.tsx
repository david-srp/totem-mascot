// 输入区：快捷提问 + 自适应高度的输入框。⌘/Ctrl+Enter 或点箭头发送。
import { useRef, useState } from 'react'
import { tr } from '../i18n'

interface Props {
  busy: boolean
  quick: string[]
  onSend: (text: string) => void
}

export function Composer({ busy, quick, onSend }: Props) {
  const [value, setValue] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)

  const doSend = () => {
    if (!value.trim()) return
    setValue('')
    if (taRef.current) taRef.current.style.height = 'auto'
    onSend(value)
  }

  return (
    <div className="comp">
      <div className="in">
        {quick.length > 0 && (
          <div className="quick">
            {quick.map((q) => (
              <button key={q} onClick={() => { if (!busy) onSend(q) }}>{q}</button>
            ))}
          </div>
        )}
        <div className="field">
          <textarea
            ref={taRef}
            rows={1}
            placeholder={tr('a.ph')}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px'
            }}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') doSend() }}
          />
          <button className="btn send" aria-label="发送" disabled={busy} onClick={doSend}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
