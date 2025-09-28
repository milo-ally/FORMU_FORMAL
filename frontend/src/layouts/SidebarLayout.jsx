import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import App from '../App.jsx'
import { clearToken, isAuthed } from '../auth.js'
import { resetUsageState } from '../hooks/useUsageCount.js'

export default function SidebarLayout({ children }) {
  const loc = useLocation()
  const navigate = useNavigate()
  
  const logout = () => { 
    clearToken(); 
    resetUsageState();
    navigate('/login') 
  }
  
  const menu = [
    { to: '/dashboard', label: '3D模型生成' },
    { to: '/projects', label: '历史项目' },
    { to: '/profile', label: '个人资料' },
  ]
  const showOverlay = loc.pathname !== '/dashboard'
  const [collapsed, setCollapsed] = useState(false)
  const asideWidth = useMemo(() => collapsed ? 64 : 244, [collapsed])
  return (
    <div style={{minHeight:'100vh'}}>
      <aside className={`sidebar card-3d ${collapsed ? 'collapsed' : ''}`} style={{position:'fixed', left:16, top:16, bottom:16, width:asideWidth, padding:16}}>
        <button className="sidebar-toggle btn-circle" aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'} onClick={()=> setCollapsed(v=>!v)}>
          <span style={{fontSize:18, lineHeight:1}}>{collapsed ? '›' : '‹'}</span>
        </button>
        {!collapsed && (
          <>
            <div className="title" style={{fontSize:20, marginBottom:12}}>导航</div>
            
            
            <nav className="sidebar-nav">
              {menu.map(m => (
                <Link key={m.to} to={m.to} className={loc.pathname === m.to ? 'active' : ''}>
                  {m.label}
                </Link>
              ))}
            </nav>
            <div style={{marginTop:'auto'}}>
              {isAuthed() && <button className="btn-primary" onClick={logout} style={{width:'100%'}}>退出登录</button>}
            </div>
          </>
        )}
      </aside>
      <main style={{display:'grid', gridTemplateColumns:'1fr', position:'relative', padding:'16px 24px', marginLeft: asideWidth + 32}}>
        {/* App 始终挂载，保持生成任务与输出，不随路由卸载 */}
        <div style={{
          gridRow:1,
          gridColumn:1,
          position:'relative',
          zIndex: showOverlay ? 0 : 1,
          opacity: showOverlay ? 0 : 1,
          visibility: showOverlay ? 'hidden' : 'visible',
          pointerEvents: showOverlay ? 'none' : 'auto',
          transition: 'opacity 150ms ease'
        }}>
          <App />
        </div>
        {/* 路由页面覆盖在上层，但不影响 App 的存在 */}
        {showOverlay && (
          <div className="route-layer" style={{
            gridRow:1,
            gridColumn:1,
            zIndex: 10,
            position:'relative'
          }}>
            {children || <Outlet />}
          </div>
        )}
      </main>
    </div>
  )
}



