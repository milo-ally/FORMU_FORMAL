import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginRequest, saveToken, USER_TYPES, USER_TYPE_CONFIG, setCurrentUsername } from '../auth.js'
import { forceRefreshUsage } from '../hooks/useUsageCount.js'
import { getServerUsage, updateUserType, adminAssignUserType } from '../api.js'
import SystemConfig from '../components/SystemConfig.jsx'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showUserTypeAssignment, setShowUserTypeAssignment] = useState(false)
  const [selectedUserType, setSelectedUserType] = useState('')
  const [targetUsername, setTargetUsername] = useState('')
  const [showSystemConfig, setShowSystemConfig] = useState(false)
  const [adminAuthFor, setAdminAuthFor] = useState('') // 废弃但保持变量以最小侵入
  const [adminPassword, setAdminPassword] = useState('')
  const [assignMessage, setAssignMessage] = useState('')
  const [assignIsError, setAssignIsError] = useState(false)

  // 页面加载时的调试日志
  React.useEffect(() => {
    console.log('Login component mounted, React is working')
  }, [])

  const handleUserTypeAssignment = async (userType) => {
    console.log('handleUserTypeAssignment called with:', { userType, targetUsername, username, adminPassword: adminPassword ? 'present' : 'missing' })
    const effectiveTarget = (targetUsername || username || '').trim()
    console.log('effectiveTarget:', effectiveTarget)
    if (!effectiveTarget) {
      console.log('Early return: no target username')
      setError('请输入目标用户名');
      return;
    }
    if (!adminPassword) {
      console.log('Early return: no admin password')
      setError('请输入管理员密码');
      return;
    }
    console.log('Validation passed, proceeding with assignment')
    
    try {
      setAssignMessage('')
      setAssignIsError(false)
      // 调用后端 API 更新指定用户的类型
      // 优先使用管理员账号（在分配面板内输入）登录获取一次性 Token
      let adminToken = null
      if (adminPassword) {
        const resp = await fetch('/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'Lihan', password: adminPassword })
        })
        if (!resp.ok) {
          const msg = await resp.text().catch(()=> '')
          throw new Error(msg || '管理员验证失败')
        }
        const data = await resp.json()
        adminToken = data?.access_token || null
        if (!adminToken) throw new Error('管理员验证失败：未获取到 Token')
      }

      // 优先尝试一步式管理员分配，减少 token 获取失败等隐患
      let assignRes = null
      try {
        console.log('Attempting adminAssignUserType...', { adminUsername: 'Lihan', username: effectiveTarget, userType })
        assignRes = await adminAssignUserType({ adminUsername: 'Lihan', adminPassword, username: effectiveTarget, userType })
        console.log('adminAssignUserType success:', assignRes)
      } catch (e) {
        console.error('adminAssignUserType failed:', e.message)
        // 回退到传统：先用管理员获取 token，再调用 usage 接口
        console.log('Falling back to updateUserType with token:', adminToken ? 'present' : 'missing')
        const fallback = await updateUserType({ userType, username: effectiveTarget, tokenOverride: adminToken })
        console.log('updateUserType fallback result:', fallback)
        assignRes = fallback
      }
      if (!assignRes?.ok) throw new Error('分配失败')
      console.log(`User ${assignRes.username} type updated to: ${assignRes.user_type}`);
      setSelectedUserType(userType);
      setTargetUsername('');
      setError('');
      setAssignMessage(`已为 ${assignRes.username} 分配为「${USER_TYPE_CONFIG[assignRes.user_type]?.name || assignRes.user_type}」`)
      setAssignIsError(false)
      // 分配成功后尝试直接使用下方登录表单的密码为该用户自动登录
      try {
        const token = await loginRequest({ username: assignRes.username, password })
        saveToken(token)
        setCurrentUsername(assignRes.username)
        await forceRefreshUsage()
        navigate('/dashboard')
        return
      } catch (e) {
        // 自动登录失败则提示手动登录
        // 保留绿色成功提示，同时给出补充提醒
        setAssignMessage(prev => prev ? prev + '。请使用该账号登录系统' : '分配成功，请使用该账号登录系统')
      }
    } catch (err) {
      console.error('Failed to update user type:', err);
      setAssignMessage('更新用户类型失败: ' + (err.message || '未知错误'))
      setAssignIsError(true)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const token = await loginRequest({ username, password })
      saveToken(token)
      setCurrentUsername(username)
      // 登录后立刻从后端拉取使用次数到全局内存，避免依赖本地缓存
      await forceRefreshUsage()
      // 跳转到控制台，无需整页刷新
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="hero" style={{marginTop: 24}}>
        <div className="title hero-title">登录 <span className="accent" style={{color:'var(--wood-dark)'}}>FORMU</span></div>
      </div>
      <div className="subtle-sep" />

      {/* 管理员验证弹窗已移除，所有管理员权限改为后端控制 */}

      {/* 管理员分配用户类型 */}
      {showUserTypeAssignment && (
        <div className="panel card-3d" style={{maxWidth: 600, margin: '0 auto', marginBottom: '20px'}}>
          <h2 style={{margin:"4px 0 12px", color:'var(--wood-dark)'}}>分配用户类型</h2>
          <div style={{fontSize: '14px', color: '#6b7280', marginBottom: '16px'}}>
            管理员仅用于本次验证，不会登录系统
          </div>
          {assignMessage && (
            <div style={{
              marginBottom: '10px',
              color: assignIsError ? '#b91c1c' : '#16a34a',
              backgroundColor: assignIsError ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${assignIsError ? '#fecaca' : '#bbf7d0'}`,
              borderRadius: 6,
              padding: '8px 10px',
              fontSize: 12
            }}>{assignMessage}</div>
          )}
          {/* 管理员凭据（仅用于本次赋权验证） */}
          <div style={{display:'grid', gap: '8px', marginBottom:'12px'}}>
            <input type="password" placeholder="管理员密码（账号固定为 Lihan）" value={adminPassword} onChange={(e)=> setAdminPassword(e.target.value)} />
          </div>
          
          {/* 目标用户名：默认为下方登录表单填写的用户名 */}
          <div style={{marginBottom: '16px'}}>
            <input
              type="text"
              placeholder="请输入目标用户名（默认使用登录框中的用户名）"
              value={targetUsername || username}
              onChange={(e) => setTargetUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
          <div style={{display: 'grid', gap: '12px', marginBottom: '16px'}}>
            {Object.entries(USER_TYPE_CONFIG).map(([type, config]) => (
              <div 
                key={type}
                onClick={() => {
                  console.log('Button clicked for type:', type)
                  handleUserTypeAssignment(type)
                }}
                style={{
                  padding: '12px',
                  border: `2px solid ${config.color}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: `${config.color}10`,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = 'none'
                }}
              >
                <div style={{fontWeight: 'bold', color: config.color}}>
                  {config.name}
                </div>
                <div style={{fontSize: '12px', color: '#6b7280'}}>
                  {config.maxUsage === Infinity ? '无限次使用' : `最多使用${config.maxUsage}次`}
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setShowUserTypeAssignment(false)}
            style={{background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer'}}
          >
            关闭
          </button>
        </div>
      )}

      {/* 登录表单 */}
      <div className="panel card-3d" style={{maxWidth: 480, margin: '0 auto'}}>
        <h2 style={{margin:"4px 0 12px", color:'var(--wood-dark)'}}>登录</h2>
        <form onSubmit={onSubmit} className="controls" style={{flexDirection:'column', alignItems:'stretch'}}>
          <input type="text" placeholder="用户名" value={username} onChange={e=>setUsername(e.target.value)} required />
          <input type="password" placeholder="密码" value={password} onChange={e=>setPassword(e.target.value)} required />
          {error && <div style={{color:'#b91c1c'}}>{error}</div>}
          <button className="btn-primary" type="submit" disabled={loading}>{loading ? '登录中…' : '登录'}</button>
        </form>
        <div style={{marginTop:8, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '16px'}}>
          <a href="/register" style={{color:'#6b7280', fontSize: '12px', textDecoration: 'underline'}}>
            去注册
          </a>
          {/* 管理功能入口直接显示，由后端鉴权决定是否可访问 */}
          <button type="button" onClick={() => {
            console.log('Opening user type assignment panel')
            setShowUserTypeAssignment(true)
          }} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>重新分配用户类型</button>
          <button type="button" onClick={() => setShowSystemConfig(true)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>⚙️ 系统配置</button>
        </div>
      </div>

      {/* 系统配置弹窗 */}
      {showSystemConfig && (
        <SystemConfig onClose={() => setShowSystemConfig(false)} />
      )}
    </div>
  )
}
