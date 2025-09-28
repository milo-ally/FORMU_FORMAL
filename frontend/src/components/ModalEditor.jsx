import { useEffect } from 'react'

export default function ModalEditor({ open, title, value, onChange, onClose, onApply, readOnly=false }) {
  if (!open) return null

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        onApply?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onApply, onClose])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value || '')
    } catch {}
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <div className="modal-actions">
            <button className="btn-circle" onClick={copy} title="复制">⧉</button>
            {!readOnly && <button className="btn-circle" onClick={onApply} title="保存">✔</button>}
            <button className="btn-circle" onClick={onClose} title="关闭">✕</button>
          </div>
        </div>
        <textarea
          className="editor-area"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          spellCheck={false}
          placeholder="在此编辑内容…"
        />
      </div>
    </div>
  )
}


