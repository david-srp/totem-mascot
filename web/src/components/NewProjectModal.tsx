import { useEffect, useRef, useState } from 'react'
import { tr } from '../i18n'

interface Props {
  open: boolean
  onCancel: () => void
  /** 成功时由调用方关闭弹窗；抛错则把错误信息显示在弹窗里 */
  onCreate: (title: string, brief: string) => Promise<void>
}

export function NewProjectModal({ open, onCancel, onCreate }: Props) {
  const [title, setTitle] = useState('')
  const [brief, setBrief] = useState('')
  const [err, setErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTitle(''); setBrief(''); setErr('')
      const t = setTimeout(() => titleRef.current?.focus(), 60)
      return () => clearTimeout(t)
    }
  }, [open])

  const submit = async () => {
    const t = title.trim()
    if (!t) { setErr(tr('nameIt')); return }
    setSubmitting(true); setErr('')
    try {
      await onCreate(t, brief.trim())
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={'mask' + (open ? ' on' : '')} onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="sheet">
        <h2>{tr('a.mtitle')}</h2>
        <p className="sub">{tr('a.msub')}</p>
        <label htmlFor="mTitle">{tr('a.mname')}</label>
        <input
          id="mTitle" ref={titleRef} maxLength={80}
          placeholder={tr('a.mnameph')}
          value={title} onChange={(e) => setTitle(e.target.value)}
        />
        <label htmlFor="mBrief">{tr('a.mwhat')}</label>
        <textarea
          id="mBrief"
          placeholder={tr('a.mwhatph')}
          value={brief} onChange={(e) => setBrief(e.target.value)}
        />
        <div className="err">{err}</div>
        <div className="acts">
          <button className="btn soft" onClick={onCancel}>{tr('a.cancel')}</button>
          <button className="btn" disabled={submitting} onClick={submit}>{tr('a.create')}</button>
        </div>
      </div>
    </div>
  )
}
