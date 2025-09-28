import { useState, useEffect } from 'react'
import { 
  getSystemConfig, 
  saveSystemConfig, 
  validateConfig, 
  exportConfig, 
  importConfig,
  syncConfigToBackend,
  loadConfigFromBackend,
  DEFAULT_CONFIG 
} from '../config.js'
import { getToken } from '../auth.js'

export default function SystemConfig({ onClose }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('coze')
  const [adminDenied, setAdminDenied] = useState(false)
  const [inlineUsername, setInlineUsername] = useState('')
  const [inlinePassword, setInlinePassword] = useState('')
  const [inlineToken, setInlineToken] = useState('')

  // 后端管理员校验：尝试访问一个仅管理员可访问的端点（/api/config/status）
  const checkAdmin = async () => {
    try {
      const bearer = inlineToken || getToken() || ''
      const resp = await fetch('/api/config/status', {
        headers: { 'Authorization': `Bearer ${bearer}` }
      })
      if (resp.status === 401) throw new Error('未登录')
      if (resp.status === 403) { setAdminDenied(true); return false }
      if (!resp.ok) throw new Error('校验失败')
      return true
    } catch {
      setAdminDenied(true)
      return false
    }
  }

  const loadConfig = async () => {
    // 首先尝试从后端加载配置
    const backendConfig = await loadConfigFromBackend()
    if (backendConfig) {
      setConfig(backendConfig)
    } else {
      // 如果后端没有配置，使用本地配置
      const savedConfig = getSystemConfig()
      setConfig(savedConfig)
    }
  }

  const handleInputChange = (section, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
    
    // 清除该字段的错误
    if (errors[section]?.[key]) {
      setErrors(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [key]: null
        }
      }))
    }
  }

  const handleSave = async () => {
    const validation = validateConfig(config)
    if (validation.isValid) {
      setLoading(true)
      try {
        // 保存到本地
        const localSuccess = saveSystemConfig(config)
        
        // 同步到后端
        const backendSuccess = await syncConfigToBackend(config)
        
        if (localSuccess && backendSuccess) {
          setMessage('配置保存并同步成功！')
        } else if (localSuccess) {
          setMessage('配置保存成功，但后端同步失败！')
        } else {
          setMessage('配置保存失败！')
        }
      } catch (error) {
        setMessage(`保存失败: ${error.message}`)
      } finally {
        setLoading(false)
        setTimeout(() => setMessage(''), 3000)
      }
    } else {
      setErrors(validation.errors)
      setMessage('请检查配置信息！')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG)
    setErrors({})
    setMessage('已重置为默认配置')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleExport = () => {
    exportConfig()
    setMessage('配置已导出')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleImport = (e) => {
    const file = e.target.files[0]
    if (file) {
      setLoading(true)
      importConfig(file)
        .then((importedConfig) => {
          setConfig(importedConfig)
          setMessage('配置导入成功！')
          setTimeout(() => setMessage(''), 3000)
        })
        .catch((error) => {
          setMessage(`导入失败: ${error.message}`)
          setTimeout(() => setMessage(''), 3000)
        })
        .finally(() => {
          setLoading(false)
          e.target.value = '' // 清空文件输入
        })
    }
  }

  const tabs = [
    { id: 'coze', label: 'COZE服务', icon: '��' },
    { id: 'bots', label: 'Bot配置', icon: '��' },
    { id: 'tripo', label: 'Tripo服务', icon: '��' },
    { id: 'sora', label: 'Sora服务', icon: '✨' }
  ]

  // 组件挂载时进行一次后端权限检查，并加载配置
  useEffect(() => {
    (async () => {
      const ok = await checkAdmin()
      if (ok) {
        await loadConfig()
      }
    })()
  }, [])

  if (adminDenied) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
      }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '440px', padding: '20px' }}>
          <h2 style={{ margin: 0, color: '#111827' }}>管理员验证</h2>
          <div style={{ marginTop: 8, color: '#6b7280' }}>请输入管理员账号以继续</div>
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            <input placeholder="用户名（例如：Lihan）" value={inlineUsername} onChange={e=>setInlineUsername(e.target.value)} />
            <input placeholder="密码" type="password" value={inlinePassword} onChange={e=>setInlinePassword(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-primary"
                onClick={async ()=>{
                  try {
                    const resp = await fetch('/api/token', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username:inlineUsername.trim(), password:inlinePassword }) })
                    if (!resp.ok) { alert('登录失败'); return }
                    const data = await resp.json()
                    const token = data?.access_token || ''
                    if (!token) { alert('未获取到Token'); return }
                    setInlineToken(token)
                    setAdminDenied(false)
                    const ok = await checkAdmin()
                    if (ok) await loadConfig()
                  } catch (e) { alert('验证失败') }
                }}
              >登录并继续</button>
              <button onClick={onClose} style={{ background:'none', border:'1px solid #d1d5db', borderRadius:6, padding:'6px 12px', cursor:'pointer' }}>取消</button>
            </div>
            <div style={{marginTop:4, color:'#6b7280', fontSize:12}}>已登录但无权访问？请联系管理员为你的账号分配 founder 权限。</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* 头部 */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, color: '#111827' }}>系统配置</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ×
          </button>
        </div>

        {/* 标签页 */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: 'none',
                backgroundColor: activeTab === tab.id ? 'white' : 'transparent',
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? '600' : '400',
                color: activeTab === tab.id ? '#3b82f6' : '#6b7280'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflow: 'auto'
        }}>
          {/* COZE服务配置 */}
          {activeTab === 'coze' && (
            <div>
              <h3 style={{ margin: '0 0 16px 0', color: '#111827' }}>COZE服务配置</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    API地址
                  </label>
                  <input
                    type="url"
                    value={config.coze.baseUrl}
                    onChange={e => handleInputChange('coze', 'baseUrl', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="https://api.coze.cn"
                  />
                  {errors.coze?.baseUrl && (
                    <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                      {errors.coze.baseUrl}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    授权信息
                  </label>
                  <input
                    type="password"
                    value={config.coze.authorization}
                    onChange={e => handleInputChange('coze', 'authorization', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="pat_xxxxxxxxxxxxxxxx"
                  />
                  {errors.coze?.authorization && (
                    <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                      {errors.coze.authorization}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bot配置 */}
          {activeTab === 'bots' && (
            <div>
              <h3 style={{ margin: '0 0 16px 0', color: '#111827' }}>Bot配置</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    图片分析Bot ID
                  </label>
                  <input
                    type="text"
                    value={config.bots.pictureAnalysis}
                    onChange={e => handleInputChange('bots', 'pictureAnalysis', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="7535889557259419663"
                  />
                  {errors.bots?.pictureAnalysis && (
                    <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                      {errors.bots.pictureAnalysis}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    可爱风格Bot ID
                  </label>
                  <input
                    type="text"
                    value={config.bots.cuteStyle}
                    onChange={e => handleInputChange('bots', 'cuteStyle', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="7535162220498894900"
                  />
                  {errors.bots?.cuteStyle && (
                    <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                      {errors.bots.cuteStyle}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    蒸汽朋克风格Bot ID
                  </label>
                  <input
                    type="text"
                    value={config.bots.steampunkStyle}
                    onChange={e => handleInputChange('bots', 'steampunkStyle', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="7535162220498894900"
                  />
                  {errors.bots?.steampunkStyle && (
                    <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                      {errors.bots.steampunkStyle}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    日漫风格Bot ID
                  </label>
                  <input
                    type="text"
                    value={config.bots.japaneseComicStyle}
                    onChange={e => handleInputChange('bots', 'japaneseComicStyle', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="7535162220498894900"
                  />
                  {errors.bots?.japaneseComicStyle && (
                    <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                      {errors.bots.japaneseComicStyle}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    美漫风格Bot ID
                  </label>
                  <input
                    type="text"
                    value={config.bots.americanComicStyle}
                    onChange={e => handleInputChange('bots', 'americanComicStyle', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="7535162220498894900"
                  />
                  {errors.bots?.americanComicStyle && (
                    <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                      {errors.bots.americanComicStyle}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    职业风格Bot ID
                  </label>
                  <input
                    type="text"
                    value={config.bots.professionStyle}
                    onChange={e => handleInputChange('bots', 'professionStyle', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="7535162220498894900"
                  />
                  {errors.bots?.professionStyle && (
                    <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                      {errors.bots.professionStyle}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    赛博朋克风格Bot ID
                  </label>
                  <input
                    type="text"
                    value={config.bots.cyberpunkStyle}
                    onChange={e => handleInputChange('bots', 'cyberpunkStyle', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="7535162220498894900"
                  />
                  {errors.bots?.cyberpunkStyle && (
                    <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                      {errors.bots.cyberpunkStyle}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    哥特风格Bot ID
                  </label>
                  <input
                    type="text"
                    value={config.bots.gothicStyle}
                    onChange={e => handleInputChange('bots', 'gothicStyle', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="7535162220498894900"
                  />
                  {errors.bots?.gothicStyle && (
                    <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                      {errors.bots.gothicStyle}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    写实风格Bot ID
                  </label>
                  <input
                    type="text"
                    value={config.bots.realisticStyle}
                    onChange={e => handleInputChange('bots', 'realisticStyle', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="7535162220498894900"
                  />
                  {errors.bots?.realisticStyle && (
                    <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                      {errors.bots.realisticStyle}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tripo服务配置 */}
          {activeTab === 'tripo' && (
            <div>
              <h3 style={{ margin: '0 0 16px 0', color: '#111827' }}>Tripo服务配置</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    API密钥
                  </label>
                  <input
                    type="password"
                    value={config.tripo.apiKey}
                    onChange={e => handleInputChange('tripo', 'apiKey', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="tsk_xxxxxxxxxxxxxxxx"
                  />
                  {errors.tripo?.apiKey && (
                    <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                      {errors.tripo.apiKey}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sora服务配置 */}
          {activeTab === 'sora' && (
            <div>
              <h3 style={{ margin: '0 0 16px 0', color: '#111827' }}>Sora服务配置</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    API地址
                  </label>
                  <input
                    type="url"
                    value={config.sora.baseUrl}
                    onChange={e => handleInputChange('sora', 'baseUrl', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="https://jy.ai666.net"
                  />
                  {errors.sora?.baseUrl && (
                    <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                      {errors.sora.baseUrl}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    API密钥
                  </label>
                  <input
                    type="password"
                    value={config.sora.apiKey}
                    onChange={e => handleInputChange('sora', 'apiKey', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="sk-xxxxxxxxxxxxxxxx"
                  />
                  {errors.sora?.apiKey && (
                    <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                      {errors.sora.apiKey}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作区 */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleReset}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              重置
            </button>
            <button
              onClick={handleExport}
              style={{
                padding: '8px 16px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              导出
            </button>
            <label
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'inline-block'
              }}
            >
              导入
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              style={{
                padding: '8px 16px',
                backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </div>

        {/* 消息提示 */}
        {message && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            padding: '12px 16px',
            backgroundColor: message.includes('失败') ? '#fef2f2' : '#f0fdf4',
            color: message.includes('失败') ? '#dc2626' : '#16a34a',
            border: `1px solid ${message.includes('失败') ? '#fecaca' : '#bbf7d0'}`,
            borderRadius: '6px',
            fontSize: '14px',
            zIndex: 1001
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
