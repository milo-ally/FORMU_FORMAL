// 系统配置管理
const CONFIG_KEY = 'formu_system_config'

// 默认配置
export const DEFAULT_CONFIG = {
  // COZE 服务配置
  coze: {
    baseUrl: 'https://api.coze.cn',
    authorization: '',
  },
  
  // Bot ID 配置
  bots: {
    pictureAnalysis: '',
    cuteStyle: '',
    steampunkStyle: '',
    japaneseComicStyle: '',
    americanComicStyle: '',
    professionStyle: '',
    cyberpunkStyle: '',
    gothicStyle: '',
    realisticStyle: '',
  },
  
  // Tripo 服务配置
  tripo: {
    apiKey: '',
  },
  
  // Sora 服务配置
  sora: {
    apiKey: '',
    baseUrl: 'https://jy.ai666.net',
  },
}

// 配置验证规则
export const CONFIG_VALIDATION = {
  coze: {
    baseUrl: { required: true, type: 'url', message: 'COZE API地址格式不正确' },
    authorization: { required: true, minLength: 10, message: 'COZE授权信息不能为空' },
  },
  bots: {
    pictureAnalysis: { required: true, message: '图片分析Bot ID不能为空' },
    cuteStyle: { required: true, message: '可爱风格Bot ID不能为空' },
    steampunkStyle: { required: true, message: '蒸汽朋克风格Bot ID不能为空' },
    japaneseComicStyle: { required: true, message: '日漫风格Bot ID不能为空' },
    americanComicStyle: { required: true, message: '美漫风格Bot ID不能为空' },
    professionStyle: { required: true, message: '职业风格Bot ID不能为空' },
    cyberpunkStyle: { required: true, message: '赛博朋克风格Bot ID不能为空' },
    gothicStyle: { required: true, message: '哥特风格Bot ID不能为空' },
    realisticStyle: { required: true, message: '写实风格Bot ID不能为空' },
  },
  tripo: {
    apiKey: { required: true, minLength: 10, message: 'Tripo API密钥不能为空' },
  },
  sora: {
    apiKey: { required: true, minLength: 10, message: 'Sora API密钥不能为空' },
    baseUrl: { required: true, type: 'url', message: 'Sora API地址格式不正确' },
  },
}

// 配置管理函数
export function getSystemConfig() {
  const config = localStorage.getItem(CONFIG_KEY)
  if (config) {
    try {
      return JSON.parse(config)
    } catch (e) {
      console.error('配置解析失败:', e)
      return DEFAULT_CONFIG
    }
  }
  return DEFAULT_CONFIG
}

export function saveSystemConfig(config) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
    return true
  } catch (e) {
    console.error('配置保存失败:', e)
    return false
  }
}

export async function syncConfigToBackend(config) {
  try {
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('formu_token') || ''}`
      },
      body: JSON.stringify(config)
    })
    
    if (!response.ok) {
      throw new Error(`同步失败: ${response.status}`)
    }
    
    const result = await response.json()
    return result.success
  } catch (error) {
    console.error('同步配置到后端失败:', error)
    return false
  }
}

export async function loadConfigFromBackend() {
  try {
    const response = await fetch('/api/config', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('formu_token') || ''}` }
    })
    
    if (!response.ok) {
      throw new Error(`获取配置失败: ${response.status}`)
    }
    
    const result = await response.json()
    if (result.success && result.config) {
      saveSystemConfig(result.config)
      return result.config
    }
    return null
  } catch (error) {
    console.error('从后端加载配置失败:', error)
    return null
  }
}

export function clearSystemConfig() {
  localStorage.removeItem(CONFIG_KEY)
}

export function validateConfig(config) {
  const errors = {}
  
  // 验证COZE配置
  if (CONFIG_VALIDATION.coze) {
    const cozeErrors = {}
    for (const [key, rules] of Object.entries(CONFIG_VALIDATION.coze)) {
      const value = config.coze?.[key]
      const error = validateField(value, rules)
      if (error) {
        cozeErrors[key] = error
      }
    }
    if (Object.keys(cozeErrors).length > 0) {
      errors.coze = cozeErrors
    }
  }
  
  // 验证Bot配置
  if (CONFIG_VALIDATION.bots) {
    const botsErrors = {}
    for (const [key, rules] of Object.entries(CONFIG_VALIDATION.bots)) {
      const value = config.bots?.[key]
      const error = validateField(value, rules)
      if (error) {
        botsErrors[key] = error
      }
    }
    if (Object.keys(botsErrors).length > 0) {
      errors.bots = botsErrors
    }
  }
  
  // 验证Tripo配置
  if (CONFIG_VALIDATION.tripo) {
    const tripoErrors = {}
    for (const [key, rules] of Object.entries(CONFIG_VALIDATION.tripo)) {
      const value = config.tripo?.[key]
      const error = validateField(value, rules)
      if (error) {
        tripoErrors[key] = error
      }
    }
    if (Object.keys(tripoErrors).length > 0) {
      errors.tripo = tripoErrors
    }
  }
  
  // 验证Sora配置
  if (CONFIG_VALIDATION.sora) {
    const soraErrors = {}
    for (const [key, rules] of Object.entries(CONFIG_VALIDATION.sora)) {
      const value = config.sora?.[key]
      const error = validateField(value, rules)
      if (error) {
        soraErrors[key] = error
      }
    }
    if (Object.keys(soraErrors).length > 0) {
      errors.sora = soraErrors
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

function validateField(value, rules) {
  if (rules.required && (!value || value.toString().trim() === '')) {
    return rules.message || '此字段不能为空'
  }
  
  if (value && rules.type === 'url') {
    try {
      new URL(value)
    } catch {
      return rules.message || 'URL格式不正确'
    }
  }
  
  if (value && rules.type === 'number') {
    const num = Number(value)
    if (isNaN(num)) {
      return rules.message || '必须是数字'
    }
    if (rules.min !== undefined && num < rules.min) {
      return rules.message || `不能小于${rules.min}`
    }
    if (rules.max !== undefined && num > rules.max) {
      return rules.message || `不能大于${rules.max}`
    }
  }
  
  if (value && rules.minLength && value.toString().length < rules.minLength) {
    return rules.message || `长度不能少于${rules.minLength}个字符`
  }
  
  return null
}

export function exportConfig() {
  const config = getSystemConfig()
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'formu-config.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function importConfig(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result)
        const validation = validateConfig(config)
        if (validation.isValid) {
          saveSystemConfig(config)
          resolve(config)
        } else {
          reject(new Error('配置文件格式不正确或缺少必要字段'))
        }
      } catch (error) {
        reject(new Error('配置文件解析失败'))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}
