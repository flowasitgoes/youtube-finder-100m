const fs = require('fs');
const path = require('path');

// API 統計檔案路徑
const API_STATS_FILE = path.join(__dirname, 'api-stats.json');

/**
 * 讀取 API 統計資訊
 * @returns {Object} API 統計資訊
 */
function readApiStats() {
  try {
    if (fs.existsSync(API_STATS_FILE)) {
      const data = fs.readFileSync(API_STATS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('讀取 API 統計資訊失敗:', error);
  }
  
  // 預設值
  return {
    total: 0,
    today: 0,
    todayDate: new Date().toDateString(),
    requests: []
  };
}

/**
 * 儲存 API 統計資訊
 * @param {Object} stats - 統計資訊物件
 */
function saveApiStats(stats) {
  try {
    fs.writeFileSync(API_STATS_FILE, JSON.stringify(stats, null, 2), 'utf8');
  } catch (error) {
    console.error('儲存 API 統計資訊失敗:', error);
  }
}

/**
 * 重置每日計數器（如果日期改變）
 * @param {Object} stats - 統計資訊物件
 * @returns {Object} 更新後的統計資訊
 */
function resetDailyCounterIfNeeded(stats) {
  const today = new Date().toDateString();
  if (stats.todayDate !== today) {
    stats.today = 0;
    stats.todayDate = today;
    saveApiStats(stats);
  }
  return stats;
}

/**
 * 記錄 API 請求
 * @param {string} endpoint - API 端點名稱
 * @param {Object} params - 請求參數
 * @returns {Object} 更新後的統計資訊
 */
function recordApiRequest(endpoint, params = {}) {
  let stats = readApiStats();
  
  // 檢查是否需要重置每日計數器
  stats = resetDailyCounterIfNeeded(stats);
  
  // 更新統計資訊
  stats.total++;
  stats.today++;
  
  // 記錄請求詳情
  stats.requests.push({
    timestamp: new Date().toISOString(),
    endpoint: endpoint,
    params: params
  });
  
  // 只保留最近 100 筆記錄
  if (stats.requests.length > 100) {
    stats.requests.shift();
  }
  
  // 儲存到檔案
  saveApiStats(stats);
  
  console.log(`[API Request] ${endpoint} - 總計: ${stats.total}, 今日: ${stats.today}`);
  
  return stats;
}

/**
 * 取得統計資訊
 * @returns {Object} 統計資訊
 */
function getStats() {
  let stats = readApiStats();
  stats = resetDailyCounterIfNeeded(stats);
  
  return {
    totalRequests: stats.total,
    todayRequests: stats.today,
    todayDate: stats.todayDate,
    recentRequests: stats.requests.slice(-20), // 最近 20 筆請求
    quotaInfo: {
      note: 'YouTube API 免費配額：每日 10,000 單位',
      remainingEstimate: Math.max(0, 10000 - stats.today),
      usagePercentage: ((stats.today / 10000) * 100).toFixed(2) + '%'
    }
  };
}

module.exports = {
  recordApiRequest,
  getStats,
  readApiStats,
  saveApiStats
};
