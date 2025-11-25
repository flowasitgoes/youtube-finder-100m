// Vercel Serverless Function adapter for Express app
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const searchHistory = require('../searchHistory');
const apiStats = require('../apiStats');
const searchRequestLog = require('../searchRequestLog');

// Load environment variables
// 在 Vercel 上，优先使用环境变量；本地开发时尝试从 key.env 读取
if (!process.env.VERCEL && !process.env.YOUTUBE_API_KEY) {
  try {
    require('dotenv').config({ path: path.join(__dirname, '../key.env') });
  } catch (error) {
    console.log('无法从 key.env 读取环境变量，使用默认值或环境变量');
  }
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// YouTube Data API key
// 优先使用环境变量（Vercel 会自动注入），否则使用 key.env 或默认值
const API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyCR5TNSzSDe5T0bJk16H9_oz1QSZsTX3CI';
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Search videos function
async function searchVideos(query = '', maxResults = 50, minViewCount = 100000000, logData = {}) {
  try {
    const stats = apiStats.getStats();
    if (stats.todayRequests >= 9000) {
      throw new Error('API 配額即將用盡，今日已使用 ' + stats.todayRequests + ' 單位，建議使用搜尋歷史功能');
    }
    let allVideoIds = [];
    let nextPageToken = null;
    let searchRequestCount = 0;
    let videoRequestCount = 0;
    const maxRequests = Math.ceil(maxResults / 50);
    const pageTokens = [];
    
    do {
      const searchParams = {
        part: 'snippet',
        q: query,
        type: 'video',
        order: 'viewCount',
        maxResults: 50,
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
      
      if (allVideoIds.length >= maxResults || !nextPageToken || searchRequestCount >= maxRequests) {
        break;
      }
    } while (allVideoIds.length < maxResults && nextPageToken);

    allVideoIds = allVideoIds.slice(0, maxResults);
    const rawCount = allVideoIds.length;

    if (allVideoIds.length === 0) {
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
      .sort((a, b) => b.viewCount - a.viewCount);

    const filteredCount = filteredVideos.length;
    
    const viewCounts = filteredVideos.map(v => v.viewCount);
    const averageViewCount = viewCounts.length > 0 
      ? Math.round(viewCounts.reduce((a, b) => a + b, 0) / viewCounts.length)
      : 0;
    const topVideo = filteredVideos.length > 0 ? {
      id: filteredVideos[0].id,
      title: filteredVideos[0].title,
      viewCount: filteredVideos[0].viewCount
    } : null;

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
    if (error.response?.status === 403) {
      const errorMessage = error.response?.data?.error?.message || '';
      if (errorMessage.includes('quota') || errorMessage.includes('exceeded')) {
        error.quotaExceeded = true;
      }
    }
    throw error;
  }
}

// API Routes
app.get('/api/search', async (req, res) => {
  try {
    const { query = '', maxResults = 50, minViewCount = 100000000 } = req.query;
    const result = await searchVideos(query, parseInt(maxResults), parseInt(minViewCount), { 
      shouldLog: true, 
      source: 'web' 
    });
    const videos = result.videos;
    // 只在本地开发环境保存搜索历史，Vercel 部署时不保存
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
    if (!isVercel) {
      searchHistory.saveSearchHistory(query, videos, parseInt(maxResults));
    }
    res.json({
      success: true,
      data: videos,
      total: videos.length,
      message: `找到 ${videos.length} 部符合條件的影片`,
      logInfo: result.logInfo
    });
  } catch (error) {
    console.error('API 錯誤:', error);
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
    // 确保错误消息始终是字符串
    let errorMessage = '未知錯誤';
    if (error.response?.data?.error?.message) {
      errorMessage = typeof error.response.data.error.message === 'string'
        ? error.response.data.error.message
        : String(error.response.data.error.message || '未知錯誤');
    } else if (error.message) {
      errorMessage = typeof error.message === 'string'
        ? error.message
        : String(error.message || '未知錯誤');
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: '搜尋失敗',
      message: errorMessage
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/stats', (req, res) => {
  try {
    const stats = apiStats.getStats();
    res.json({ success: true, stats: stats });
  } catch (error) {
    console.error('取得統計資訊錯誤:', error);
    res.status(500).json({
      success: false,
      error: '取得統計資訊失敗',
      message: error.message
    });
  }
});

app.get('/api/history', (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const history = searchHistory.readSearchHistory();
    const limitedHistory = history.slice(0, parseInt(limit)).map(record => ({
      id: record.id,
      // 确保 query 是字符串，防止显示 [object Object]
      query: typeof record.query === 'string' ? record.query : String(record.query || '未知查詢'),
      timestamp: record.timestamp,
      resultCount: record.resultCount,
      maxResults: record.maxResults
    }));
    res.json({ success: true, total: history.length, data: limitedHistory });
  } catch (error) {
    console.error('讀取搜尋歷史錯誤:', error);
    res.status(500).json({
      success: false,
      error: '讀取搜尋歷史失敗',
      message: error.message
    });
  }
});

app.get('/api/history/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { query } = req.query;
    let record = null;
    if (id && id !== 'undefined') {
      record = searchHistory.getSearchHistoryById(id);
    } else if (query) {
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

app.delete('/api/history', (req, res) => {
  try {
    searchHistory.clearSearchHistory();
    res.json({ success: true, message: '搜尋歷史已清除' });
  } catch (error) {
    console.error('刪除搜尋歷史錯誤:', error);
    res.status(500).json({
      success: false,
      error: '刪除搜尋歷史失敗',
      message: error.message
    });
  }
});

app.get('/api/logs', (req, res) => {
  try {
    const { limit = 100, query } = req.query;
    const logs = searchRequestLog.getLogs({ limit: parseInt(limit), query });
    res.json({ success: true, total: logs.length, data: logs });
  } catch (error) {
    console.error('讀取日誌錯誤:', error);
    res.status(500).json({
      success: false,
      error: '讀取日誌失敗',
      message: error.message
    });
  }
});

app.get('/api/logs/statistics', (req, res) => {
  try {
    const statistics = searchRequestLog.getStatistics();
    res.json({ success: true, statistics });
  } catch (error) {
    console.error('取得日誌統計錯誤:', error);
    res.status(500).json({
      success: false,
      error: '取得日誌統計失敗',
      message: error.message
    });
  }
});

app.delete('/api/logs', (req, res) => {
  try {
    searchRequestLog.clearLog();
    res.json({ success: true, message: '日誌已清除' });
  } catch (error) {
    console.error('清除日誌錯誤:', error);
    res.status(500).json({
      success: false,
      error: '清除日誌失敗',
      message: error.message
    });
  }
});

// Export handler for Vercel Serverless Functions
module.exports = serverless(app);

