const express = require('express');
const cors = require('cors');
const axios = require('axios');
const searchHistory = require('./searchHistory');
const apiStats = require('./apiStats');
const searchRequestLog = require('./searchRequestLog');
require('dotenv').config({ path: './key.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// 中間件
app.use(cors());
app.use(express.json());

// YouTube Data API 金鑰
const API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyCR5TNSzSDe5T0bJk16H9_oz1QSZsTX3CI';
const BASE_URL = 'https://www.googleapis.com/youtube/v3';


// 搜尋影片的函數（支援分頁以獲取更多結果）
async function searchVideos(query = '', maxResults = 50, minViewCount = 100000000, logData = {}) {
  try {
    // 檢查配額（在發送請求前先檢查）
    const stats = apiStats.getStats();
    if (stats.todayRequests >= 9000) {
      throw new Error('API 配額即將用盡，今日已使用 ' + stats.todayRequests + ' 單位，建議使用搜尋歷史功能');
    }
    let allVideoIds = [];
    let nextPageToken = null;
    let searchRequestCount = 0;
    let videoRequestCount = 0;
    const maxRequests = Math.ceil(maxResults / 50); // 計算需要幾次請求（每次最多50筆）
    const pageTokens = []; // 記錄使用的分頁 token
    
    // 使用分頁來獲取更多結果
    do {
      const searchParams = {
        part: 'snippet',
        q: query,
        type: 'video',
        order: 'viewCount',
        maxResults: 50, // YouTube API 每次最多 50 筆
        key: API_KEY
      };
      
      if (nextPageToken) {
        searchParams.pageToken = nextPageToken;
        pageTokens.push(nextPageToken);
      }

      const searchResponse = await axios.get(`${BASE_URL}/search`, { params: searchParams });
      apiStats.recordApiRequest('search', { query, maxResults: 50, pageToken: nextPageToken || 'first' });
      searchRequestCount++;
      
      const videoIds = searchResponse.data.items.map(item => item.id.videoId);
      allVideoIds = allVideoIds.concat(videoIds);
      
      nextPageToken = searchResponse.data.nextPageToken;
      
      // 如果已經獲取足夠的結果，或沒有更多頁面，就停止
      if (allVideoIds.length >= maxResults || !nextPageToken || searchRequestCount >= maxRequests) {
        break;
      }
    } while (allVideoIds.length < maxResults && nextPageToken);

    // 限制到請求的數量
    allVideoIds = allVideoIds.slice(0, maxResults);
    const rawCount = allVideoIds.length;

    if (allVideoIds.length === 0) {
      // 記錄空結果
      if (logData.shouldLog) {
        searchRequestLog.logSearchRequest({
          query,
          maxResults,
          requestedResults: maxResults,
          searchRequests: searchRequestCount,
          videoRequests: videoRequestCount,
          usedPagination: pageTokens.length > 0,
          pageTokens,
          rawCount: 0,
          filteredCount: 0,
          minViewCount: minViewCount,
          source: logData.source || 'web',
          historyId: logData.historyId || null
        });
      }
      return { videos: [], logInfo: { rawCount: 0, filteredCount: 0, searchRequests: searchRequestCount, videoRequests: videoRequestCount, usedPagination: pageTokens.length > 0 } };
    }

    // 分批獲取詳細的影片統計數據（YouTube API 的 videos 端點最多一次查詢 50 個 ID）
    let allVideos = [];
    for (let i = 0; i < allVideoIds.length; i += 50) {
      const batchIds = allVideoIds.slice(i, i + 50);
      const videoParams = {
        part: 'snippet,statistics',
        id: batchIds.join(','),
        key: API_KEY
      };

      const videoResponse = await axios.get(`${BASE_URL}/videos`, { params: videoParams });
      apiStats.recordApiRequest('videos', { videoCount: batchIds.length });
      videoRequestCount++;
      allVideos = allVideos.concat(videoResponse.data.items);
    }

    // 過濾條件：點閱率 >= minViewCount
    const filteredVideos = allVideos
      .filter(video => {
        const viewCount = parseInt(video.statistics.viewCount || 0);
        return viewCount >= minViewCount;
      })
      .map(video => ({
        id: video.id,
        title: video.snippet.title,
        channelTitle: video.snippet.channelTitle,
        viewCount: parseInt(video.statistics.viewCount || 0),
        likeCount: parseInt(video.statistics.likeCount || 0),
        publishedAt: video.snippet.publishedAt,
        thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
        videoUrl: `https://www.youtube.com/watch?v=${video.id}`
      }))
      .sort((a, b) => b.viewCount - a.viewCount); // 按點閱率降序排列

    const filteredCount = filteredVideos.length;
    
    // 計算統計資訊
    const viewCounts = filteredVideos.map(v => v.viewCount);
    const averageViewCount = viewCounts.length > 0 
      ? Math.round(viewCounts.reduce((a, b) => a + b, 0) / viewCounts.length)
      : 0;
    const topVideo = filteredVideos.length > 0 ? {
      id: filteredVideos[0].id,
      title: filteredVideos[0].title,
      viewCount: filteredVideos[0].viewCount
    } : null;

    // 記錄日誌
    if (logData.shouldLog) {
      searchRequestLog.logSearchRequest({
        query,
        maxResults,
        requestedResults: maxResults,
        searchRequests: searchRequestCount,
        videoRequests: videoRequestCount,
        usedPagination: pageTokens.length > 0,
        pageTokens,
        rawCount,
        filteredCount,
        minViewCount: minViewCount,
        topVideo,
        averageViewCount,
        source: logData.source || 'web',
        historyId: logData.historyId || null
      });
    }

    console.log(`搜尋完成: 請求了 ${rawCount} 筆，過濾後得到 ${filteredCount} 筆符合條件的影片`);
    
    return { 
      videos: filteredVideos, 
      logInfo: { 
        rawCount, 
        filteredCount, 
        searchRequests: searchRequestCount, 
        videoRequests: videoRequestCount, 
        usedPagination: pageTokens.length > 0 
      } 
    };
  } catch (error) {
    console.error('搜尋影片時發生錯誤:', error.response?.data || error.message);
    // 如果是配額錯誤，標記以便上層處理
    if (error.response?.status === 403) {
      const errorMessage = error.response?.data?.error?.message || '';
      if (errorMessage.includes('quota') || errorMessage.includes('exceeded')) {
        error.quotaExceeded = true;
      }
    }
    throw error;
  }
}


// API 路由：搜尋影片
app.get('/api/search', async (req, res) => {
  try {
    const { query = '', maxResults = 50, minViewCount = 100000000 } = req.query;

    console.log(`開始搜尋: query="${query}", maxResults=${maxResults}, minViewCount=${minViewCount}`);

    const result = await searchVideos(query, parseInt(maxResults), parseInt(minViewCount), { 
      shouldLog: true, 
      source: 'web' 
    });
    const videos = result.videos;

    // 儲存搜尋紀錄
    searchHistory.saveSearchHistory(query, videos, parseInt(maxResults));

    res.json({
      success: true,
      data: videos,
      total: videos.length,
      message: `找到 ${videos.length} 部符合條件的影片`,
      logInfo: result.logInfo  // 包含日誌資訊
    });
  } catch (error) {
    console.error('API 錯誤:', error);
    
    // 檢查是否為配額用盡錯誤
    if (error.quotaExceeded || error.response?.status === 403) {
      const errorMessage = error.response?.data?.error?.message || error.message || '';
      if (error.quotaExceeded || errorMessage.includes('quota') || errorMessage.includes('exceeded')) {
        return res.status(403).json({
          success: false,
          error: 'API 配額已用盡',
          message: 'YouTube API 的每日配額（10,000 單位）已用盡。請等待明天配額重置，或使用搜尋歷史查看之前的結果。',
          quotaExceeded: true
        });
      }
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: '搜尋失敗',
      message: error.response?.data?.error?.message || error.message || '未知錯誤'
    });
  }
});

// API 路由：健康檢查
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API 路由：查看請求統計
app.get('/api/stats', (req, res) => {
  try {
    const stats = apiStats.getStats();
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('取得統計資訊錯誤:', error);
    res.status(500).json({
      success: false,
      error: '取得統計資訊失敗',
      message: error.message
    });
  }
});

// API 路由：查看搜尋歷史列表（只返回基本資訊，不包含完整影片資料）
app.get('/api/history', (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const history = searchHistory.readSearchHistory();
    const limitedHistory = history.slice(0, parseInt(limit)).map(record => ({
      id: record.id,
      query: record.query,
      timestamp: record.timestamp,
      resultCount: record.resultCount,
      maxResults: record.maxResults
    }));
    
    res.json({
      success: true,
      total: history.length,
      data: limitedHistory
    });
  } catch (error) {
    console.error('讀取搜尋歷史錯誤:', error);
    res.status(500).json({
      success: false,
      error: '讀取搜尋歷史失敗',
      message: error.message
    });
  }
});

// API 路由：根據 ID 或關鍵字從歷史記錄中取得搜尋結果（不發送新的 API 請求）
app.get('/api/history/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { query } = req.query;
    
    let record = null;
    if (id && id !== 'undefined') {
      // 根據 ID 取得歷史記錄
      record = searchHistory.getSearchHistoryById(id);
    } else if (query) {
      // 根據關鍵字取得最近的歷史記錄
      record = searchHistory.getSearchHistoryByQuery(query);
    }
    
    if (!record) {
      return res.status(404).json({
        success: false,
        error: '找不到該搜尋記錄',
        message: '請重新搜尋'
      });
    }
    
    res.json({
      success: true,
      data: record.videos,
      total: record.resultCount,
      query: record.query,
      timestamp: record.timestamp,
      fromHistory: true,
      message: `從歷史記錄載入：找到 ${record.resultCount} 部符合條件的影片`
    });
  } catch (error) {
    console.error('讀取搜尋歷史錯誤:', error);
    res.status(500).json({
      success: false,
      error: '讀取搜尋歷史失敗',
      message: error.message
    });
  }
});

// API 路由：刪除搜尋歷史
app.delete('/api/history', (req, res) => {
  try {
    searchHistory.clearSearchHistory();
    res.json({
      success: true,
      message: '搜尋歷史已清除'
    });
  } catch (error) {
    console.error('刪除搜尋歷史錯誤:', error);
    res.status(500).json({
      success: false,
      error: '刪除搜尋歷史失敗',
      message: error.message
    });
  }
});

// API 路由：查看搜尋和請求日誌
app.get('/api/logs', (req, res) => {
  try {
    const { limit = 100, query } = req.query;
    const logs = searchRequestLog.getLogs({ limit: parseInt(limit), query });
    
    res.json({
      success: true,
      total: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('讀取日誌錯誤:', error);
    res.status(500).json({
      success: false,
      error: '讀取日誌失敗',
      message: error.message
    });
  }
});

// API 路由：查看日誌統計資訊
app.get('/api/logs/statistics', (req, res) => {
  try {
    const statistics = searchRequestLog.getStatistics();
    res.json({
      success: true,
      statistics
    });
  } catch (error) {
    console.error('取得日誌統計錯誤:', error);
    res.status(500).json({
      success: false,
      error: '取得日誌統計失敗',
      message: error.message
    });
  }
});

// API 路由：清除日誌
app.delete('/api/logs', (req, res) => {
  try {
    searchRequestLog.clearLog();
    res.json({
      success: true,
      message: '日誌已清除'
    });
  } catch (error) {
    console.error('清除日誌錯誤:', error);
    res.status(500).json({
      success: false,
      error: '清除日誌失敗',
      message: error.message
    });
  }
});

// 靜態文件服務（前端）
app.use(express.static('frontend/build'));
app.use(express.static('frontend/public'));

// 日誌頁面路由
app.get('/logs', (req, res) => {
  res.sendFile(__dirname + '/frontend/public/logs.html');
});

// 統計頁面路由
app.get('/statistics', (req, res) => {
  res.sendFile(__dirname + '/frontend/public/statistics.html');
});

// 處理前端路由（必須放在最後）
app.get('*', (req, res) => {
  // 排除 API 路由和特殊頁面
  if (req.path.startsWith('/api/') || req.path === '/logs' || req.path === '/statistics') {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(__dirname + '/frontend/build/index.html');
});

app.listen(PORT, () => {
  console.log(`服務器運行在 http://localhost:${PORT}`);
});
