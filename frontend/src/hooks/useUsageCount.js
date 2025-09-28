import { useState, useEffect, useCallback } from 'react'
import { getServerUsage } from '../api.js'

// Global state now initialized with defaults
let usageState = {
  count: 0,
  remaining: 0, // 默认显示0，需要登录后才能看到真实次数
  canUse: false, // 默认不可用，需要登录
  config: { name: '请先登录', maxUsage: 0, color: '#999999' }
};

// 监听器列表
const listeners = new Set()

// 通知所有监听器状态已更新
const notifyListeners = () => {
  listeners.forEach(listener => listener(usageState))
}

// Update to async
const updateUsageState = async () => {
  try {
    console.log('🔄 Fetching usage from server...');
    const serverData = await getServerUsage();
    console.log('📊 Server usage data:', serverData);
    console.log('🔍 Raw server response:', JSON.stringify(serverData, null, 2));
    
    // 完全依赖后端数据，不进行任何本地计算
    // 处理 null 值（表示无限）
    const config = serverData.config || {};
    if (config.maxUsage === null) {
      config.maxUsage = Infinity; // 前端使用 Infinity
    }
    
    const remaining = serverData.remaining === null ? Infinity : serverData.remaining;
    
    const newState = { 
      count: serverData.used || 0, 
      remaining: remaining, 
      canUse: serverData.can_use, 
      config: config
    };
    
    console.log('✅ Updated usage state:', newState);
    console.log('🎯 User type from server:', serverData.user_type);
    console.log('📈 Remaining usage from server:', serverData.remaining);
    console.log('🎨 Config from server:', serverData.config);
    
    usageState = newState;
    notifyListeners();
  } catch (err) {
    console.error('❌ Failed to update usage:', err);
    console.error('❌ Error details:', err.message);
    // 如果获取失败（比如未登录），显示需要登录的状态
    usageState = { 
      count: 0, 
      remaining: 0, // 未登录时显示0，需要登录
      canUse: false, // 未登录时不可用
      config: { name: '请先登录', maxUsage: 0, color: '#999999' }
    };
    notifyListeners();
  }
};

// 供外部调用：强制从后端刷新一次使用次数（登录后立即调用）
export const forceRefreshUsage = async () => {
  await updateUsageState();
  notifyListeners();
};

// 供外部调用：清空本地内存中的使用次数（登出时调用以避免显示上一次登录的缓存）
export const resetUsageState = () => {
  usageState = {
    count: 0,
    remaining: 0,
    canUse: false,
    config: { name: '请先登录', maxUsage: 0, color: '#999999' }
  };
  notifyListeners();
};

// Update hook to fetch initially and provide async refresh
export const useUsageCount = () => {
  const [state, setState] = useState(usageState);

  const refreshUsage = useCallback(async () => {
    console.log('Refreshing usage from server...'); // 调试信息
    await updateUsageState();
    setState(usageState); // Sync local state with server data
  }, []);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  // Register listener for global updates
  useEffect(() => {
    const listener = (newState) => setState(newState);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  return {
    ...state,
    refreshUsage
  };
};


