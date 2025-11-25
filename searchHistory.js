const fs = require('fs');
const path = require('path');

// 搜尋歷史檔案路徑
// 在 Vercel 上，public 目錄會被部署，所以需要檢查多個路徑
const SEARCH_HISTORY_FILE = fs.existsSync(path.join(__dirname, 'public', 'search-history.json'))
  ? path.join(__dirname, 'public', 'search-history.json')
  : path.join(__dirname, 'search-history.json');

/**
 * 讀取搜尋歷史
 * @returns {Array} 搜尋歷史陣列
 */
function readSearchHistory() {
  try {
    if (fs.existsSync(SEARCH_HISTORY_FILE)) {
      const data = fs.readFileSync(SEARCH_HISTORY_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('讀取搜尋歷史失敗:', error);
  }
  return [];
}

/**
 * 儲存搜尋紀錄
 * @param {string} query - 搜尋關鍵字
 * @param {Array} videos - 影片陣列
 * @param {number} maxResults - 最大結果數
 * @returns {Object} 儲存的搜尋紀錄
 */
function saveSearchHistory(query, videos, maxResults) {
  try {
    const history = readSearchHistory();
    const searchRecord = {
      id: Date.now().toString(),
      query: query,
      timestamp: new Date().toISOString(),
      resultCount: videos.length,
      maxResults: maxResults,
      videos: videos.map(v => ({
        id: v.id,
        title: v.title,
        channelTitle: v.channelTitle,
        viewCount: v.viewCount,
        likeCount: v.likeCount,
        publishedAt: v.publishedAt,
        thumbnail: v.thumbnail,
        videoUrl: v.videoUrl
      }))
    };

    history.unshift(searchRecord); // 新增到最前面

    // 只保留最近 100 筆搜尋紀錄
    if (history.length > 100) {
      history.splice(100);
    }

    fs.writeFileSync(SEARCH_HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
    console.log(`搜尋紀錄已儲存: "${query}" - 找到 ${videos.length} 部影片`);
    return searchRecord;
  } catch (error) {
    console.error('儲存搜尋歷史失敗:', error);
    throw error;
  }
}

/**
 * 根據 ID 取得搜尋紀錄
 * @param {string} id - 搜尋紀錄 ID
 * @returns {Object|null} 搜尋紀錄或 null
 */
function getSearchHistoryById(id) {
  try {
    const history = readSearchHistory();
    return history.find(record => record.id === id) || null;
  } catch (error) {
    console.error('讀取搜尋歷史失敗:', error);
    return null;
  }
}

/**
 * 根據關鍵字取得最近的搜尋紀錄
 * @param {string} query - 搜尋關鍵字
 * @returns {Object|null} 搜尋紀錄或 null
 */
function getSearchHistoryByQuery(query) {
  try {
    const history = readSearchHistory();
    return history.find(record => record.query.toLowerCase() === query.toLowerCase()) || null;
  } catch (error) {
    console.error('讀取搜尋歷史失敗:', error);
    return null;
  }
}

/**
 * 取得最近的搜尋歷史列表
 * @param {number} limit - 限制數量
 * @returns {Array} 搜尋歷史陣列
 */
function getRecentSearchHistory(limit = 10) {
  try {
    const history = readSearchHistory();
    return history.slice(0, limit);
  } catch (error) {
    console.error('讀取搜尋歷史失敗:', error);
    return [];
  }
}

/**
 * 清除所有搜尋歷史
 */
function clearSearchHistory() {
  try {
    if (fs.existsSync(SEARCH_HISTORY_FILE)) {
      fs.unlinkSync(SEARCH_HISTORY_FILE);
    }
    console.log('搜尋歷史已清除');
  } catch (error) {
    console.error('清除搜尋歷史失敗:', error);
    throw error;
  }
}

module.exports = {
  readSearchHistory,
  saveSearchHistory,
  getSearchHistoryById,
  getSearchHistoryByQuery,
  getRecentSearchHistory,
  clearSearchHistory
};
