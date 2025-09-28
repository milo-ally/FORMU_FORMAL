const TOKEN_KEY = 'formu_token'
const USER_TYPE_KEY = 'formu_user_type'
const CURRENT_USERNAME_KEY = 'formu_username'

// 用户类型定义
export const USER_TYPES = {
  FOUNDER: 'founder',           // 创始人 - 无限次
  TIME_MASTER: 'time_master',   // 时光主理人 - 100次
  SPARK_PARTNER: 'spark_partner' // 星火合伙人 - 7次
}

// 用户类型配置
export const USER_TYPE_CONFIG = {
  [USER_TYPES.FOUNDER]: { name: '创始人', maxUsage: Infinity, color: '#FF6B6B' },
  [USER_TYPES.TIME_MASTER]: { name: '时光主理人', maxUsage: 100, color: '#4A90E2' },
  [USER_TYPES.SPARK_PARTNER]: { name: '星火合伙人', maxUsage: 7, color: '#7ED321' }
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// 新增：clearToken 函数（SidebarLayout.jsx 需要）
export function clearToken() {
  removeToken()
}

export function isAuthenticated() {
  return !!getToken()
}

// 新增：isAuthed 函数（SidebarLayout.jsx 需要）
export function isAuthed() {
  return isAuthenticated()
}

// 管理员验证 - 移除持久化状态，每次都需要验证
// 管理员验证改为后端角色控制，前端不再校验固定密码

export function setCurrentUsername(username) {
  localStorage.setItem(CURRENT_USERNAME_KEY, username)
}

export function getCurrentUsername() {
  return localStorage.getItem(CURRENT_USERNAME_KEY)
}

// 用户类型管理
// 用户类型现在从后端获取，不再使用 localStorage
// export function setUserType(userType) { ... }

// 用户类型现在从后端获取，不再使用 localStorage
// export function getUserType() { ... }

// Updated to async server calls
export async function getUserUsageCount() {
  try {
    const { used } = await getServerUsage();
    return used || 0;
  } catch {
    return 0; // Fallback for anon or errors
  }
}

// 新增：getUsageCount 函数（SidebarLayout.jsx 需要）
export async function getUsageCount() {
  return await getUserUsageCount()
}

export async function incrementUserUsage({ taskId, serviceType }) {
  try {
    await incrementServerUsage({ taskId, serviceType });
  } catch (err) {
    console.error('Failed to increment usage:', err);
  }
}

// Remove local task id tracking as backend handles dedup
// export function getCountedTaskIds() { ... }
// export function addCountedTaskId(taskId) { ... }

// 这些函数现在不再使用，用户类型和使用次数都从后端获取
// export async function canUseService() { ... }
// export async function getRemainingUsage() { ... }

// App.jsx 中需要的函数
// export function canUseSystem() { ... }

// Remove local incrementUsageOnce as it's handled by incrementUserUsage
// export function incrementUsageOnce(taskId) { ... }

// 这个函数现在不再使用，用户类型从后端获取
// export function getUserTypeConfig() { ... }

// 带认证的fetch函数
export async function authFetch(url, options = {}) {
  const token = getToken()
  if (!token) {
    throw new Error('No authentication token')
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    ...options.headers
  }
  
  return fetch(url, {
    ...options,
    headers
  })
}

export async function loginRequest({ username, password }) {
  const resp = await fetch('/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  if (!resp.ok) {
    const msg = await resp.text()
    throw new Error(msg || '登录失败')
  }
  const data = await resp.json()
  return data?.access_token
}

export async function registerRequest({ username, password }) {
  const resp = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  if (!resp.ok) {
    const msg = await resp.text()
    throw new Error(msg || '注册失败')
  }
  return await resp.json()
}

