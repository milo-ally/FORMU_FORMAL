import { useEffect, useState } from 'react'
import { authFetch, setCurrentUsername } from '../auth.js'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    (async () => {
      const resp = await authFetch('/api/users/me')
      const data = await resp.json()
      setUser(data)
      setUsername(data?.username || '')
    })()
  }, [])

  const onSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    try {
      const resp = await authFetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      })
      if (!resp.ok) throw new Error(await resp.text() || '保存失败')
      setMsg('保存成功')
      setCurrentUsername(username)
    } catch (e) {
      setMsg(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="hero" style={{marginTop: 0}}>
        <div className="title hero-title">个人资料</div>
      </div>
      <div className="subtle-sep" />

      {!user ? (
        <div className="spinner" />
      ) : (
        <div className="panel card-3d profile-card">
          <form onSubmit={onSave} className="form-grid">
            <div className="input-wrap">
              <div className="input-label">用户名</div>
              <input className="input-box" value={username} onChange={e=>setUsername(e.target.value)} placeholder="用户名" />
            </div>
            
            <div className="full save-row">
              <button className="btn-primary" disabled={saving} type="submit">{saving ? '保存中…' : '保存'}</button>
            </div>
            {msg && <div className="full" style={{color:'var(--wood-dark)'}}>{msg}</div>}
          </form>
        </div>
      )}
    </div>
  )
}


