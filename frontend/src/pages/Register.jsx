import { useState } from 'react'
import { registerRequest } from '../auth.js'

export default function Register() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [showAdminAuth, setShowAdminAuth] = useState(false)

  // 管理员验证已移除，注册不再需要

  const onSubmit = async (e) => {
    e.preventDefault()
    setMsg('')
    setError('')
    setLoading(true)
    try {
      await registerRequest({ username, password })
      setMsg('注册成功，正在跳转登录…')
      setTimeout(()=> location.href = '/login', 900)
    } catch (err) {
      setError(err.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="hero" style={{marginTop: 24}}>
        <div className="title hero-title">创建账户 <span className="accent" style={{color:'var(--wood-dark)'}}>FORMU</span></div>
      </div>
      <div className="subtle-sep" />

      {!showAdminAuth && (
        <div className="panel card-3d" style={{maxWidth: 480, margin: '0 auto'}}>
          <h2 style={{margin:"4px 0 12px", color:'var(--wood-dark)'}}>注册</h2>
          <form onSubmit={onSubmit} className="controls" style={{flexDirection:'column', alignItems:'stretch'}}>
            <input type="text" placeholder="用户名" value={username} onChange={e=>setUsername(e.target.value)} required />
            <input type="password" placeholder="密码（至少6位）" value={password} onChange={e=>setPassword(e.target.value)} required />
            {error && <div style={{color:'#b91c1c'}}>{error}</div>}
            {msg && <div style={{color:'var(--wood-dark)'}}>{msg}</div>}
            <button className="btn-primary" type="submit" disabled={loading}>{loading ? '提交中…' : '注册'}</button>
          </form>
          <div style={{marginTop:8, color:'var(--muted)'}}>
            已有账号？ <a href="/login">去登录</a>
          </div>
        </div>
      )}
    </div>
  )
}
