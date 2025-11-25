const fs = require('fs');
const path = require('path');

// 搜尋和請求日誌檔案路徑
// 在 Vercel 上，public 目錄會被部署，所以需要檢查多個路徑
const LOG_FILE = fs.existsSync(path.join(__dirname, 'public', 'search-request-log.json'))
  ? path.join(__dirname, 'public', 'search-request-log.json')
  : path.join(__dirname, 'search-request-log.json');

/**
 * 讀取日誌檔案
 * @returns {Array} 日誌陣列
 */
function readLog() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const data = fs.readFileSync(LOG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('讀取日誌檔案失敗:', error);
  }
  return [];
}

/**
 * 儲存日誌檔案
 * @param {Array} logs - 日誌陣列
 */
function saveLog(logs) {
  try {
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), 'utf8');
  } catch (error) {
    console.error('儲存日誌檔案失敗:', error);
  }
}

/**
 * 記錄搜尋請求
 * @param {Object} logData - 日誌資料
 * @returns {string} 日誌 ID
 */
function logSearchRequest(logData) {
  const logs = readLog();
  
  const logEntry = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString('zh-TW'),
    time: new Date().toLocaleTimeString('zh-TW'),
    
    // 搜尋資訊
    search: {
      query: logData.query || '',
      maxResults: logData.maxResults || 50,
      requestedResults: logData.requestedResults || 50
    },
    
    // API 請求資訊
    apiRequests: {
      searchRequests: logData.searchRequests || 0,  // 發送了幾次 search API 請求
      videoRequests: logData.videoRequests || 0,    // 發送了幾次 videos API 請求
      totalRequests: (logData.searchRequests || 0) + (logData.videoRequests || 0),
      usedPagination: logData.usedPagination || false,  // 是否使用了分頁
      pageTokens: logData.pageTokens || []  // 使用的分頁 token
    },
    
    // 搜尋結果統計
    results: {
      rawCount: logData.rawCount || 0,           // 從 API 獲取的原始結果數量
      filteredCount: logData.filteredCount || 0, // 過濾後符合條件的數量
      filterCriteria: {
        minViewCount: logData.minViewCount || 100000000,  // 過濾條件：最低點閱率
        description: (() => {
          const minView = logData.minViewCount || 100000000;
          if (minView >= 100000000) {
            return `點閱率 >= ${(minView / 100000000).toFixed(0)} 億`;
          } else if (minView >= 10000) {
            return `點閱率 >= ${(minView / 10000).toFixed(0)} 萬`;
          } else {
            return `點閱率 >= ${minView.toLocaleString()}`;
          }
        })()
      }
    },
    
    // 結果詳情
    resultDetails: {
      hasResults: (logData.filteredCount || 0) > 0,
      topVideo: logData.topVideo || null,  // 最高點閱率的影片資訊
      averageViewCount: logData.averageViewCount || 0  // 平均點閱率
    },
    
    // 來源
    source: logData.source || 'web',  // 'web' 或 'history'
    historyId: logData.historyId || null  // 如果是從歷史記錄載入，記錄歷史 ID
    
  };
  
  logs.unshift(logEntry); // 新增到最前面
  
  // 只保留最近 500 筆記錄
  if (logs.length > 500) {
    logs.splice(500);
  }
  
  saveLog(logs);
  
  console.log(`[Search Log] 記錄搜尋: "${logData.query}" - 原始: ${logData.rawCount}, 過濾後: ${logData.filteredCount}`);
  
  return logEntry.id;
}

/**
 * 取得日誌列表
 * @param {Object} options - 選項
 * @param {number} options.limit - 限制數量
 * @param {string} options.query - 搜尋關鍵字過濾
 * @returns {Array} 日誌陣列
 */
function getLogs(options = {}) {
  let logs = readLog();
  const { limit = 100, query } = options;
  
  // 如果指定了關鍵字過濾
  if (query) {
    logs = logs.filter(log => 
      log.search.query.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  return logs.slice(0, limit);
}

/**
 * 取得統計資訊
 * @returns {Object} 統計資訊
 */
function getStatistics() {
  const logs = readLog();
  
  const today = new Date().toDateString();
  const todayLogs = logs.filter(log => new Date(log.timestamp).toDateString() === today);
  
  // 計算統計
  const totalSearches = logs.length;
  const todaySearches = todayLogs.length;
  const totalApiRequests = logs.reduce((sum, log) => sum + log.apiRequests.totalRequests, 0);
  const todayApiRequests = todayLogs.reduce((sum, log) => sum + log.apiRequests.totalRequests, 0);
  const totalRawResults = logs.reduce((sum, log) => sum + log.results.rawCount, 0);
  const totalFilteredResults = logs.reduce((sum, log) => sum + log.results.filteredCount, 0);
  const paginationUsed = logs.filter(log => log.apiRequests.usedPagination).length;
  
  // 最常搜尋的關鍵字
  const queryCounts = {};
  logs.forEach(log => {
    const q = log.search.query.toLowerCase();
    queryCounts[q] = (queryCounts[q] || 0) + 1;
  });
  const topQueries = Object.entries(queryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }));
  
  return {
    summary: {
      totalSearches,
      todaySearches,
      totalApiRequests,
      todayApiRequests,
      totalRawResults,
      totalFilteredResults,
      paginationUsed,
      filterRate: totalRawResults > 0 
        ? ((totalFilteredResults / totalRawResults) * 100).toFixed(2) + '%'
        : '0%'
    },
    topQueries
  };
}

/**
 * 清除日誌
 */
function clearLog() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      fs.unlinkSync(LOG_FILE);
    }
    console.log('日誌檔案已清除');
  } catch (error) {
    console.error('清除日誌檔案失敗:', error);
    throw error;
  }
}

module.exports = {
  logSearchRequest,
  getLogs,
  getStatistics,
  clearLog
};
