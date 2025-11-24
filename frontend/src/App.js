import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Card,
  CardContent,
  CardMedia,
  Grid,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  IconButton,
  Toolbar,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import InfoIcon from '@mui/icons-material/Info';
import HistoryIcon from '@mui/icons-material/History';
import DeleteIcon from '@mui/icons-material/Delete';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import BarChartIcon from '@mui/icons-material/BarChart';
import axios from 'axios';

function App() {
  const [query, setQuery] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [stats, setStats] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [maxResults, setMaxResults] = useState(100); // 預設搜尋 100 筆以觸發分頁
  const [minViewCount, setMinViewCount] = useState(100000000); // 預設點閱率門檻 1 億

  const handleSearch = async (searchQuery = null, historyId = null) => {
    const queryToSearch = String(searchQuery || query || '').trim();
    if (!queryToSearch) {
      setError('請輸入搜尋關鍵字');
      return;
    }

    setLoading(true);
    setError('');
    setSearchPerformed(true);
    if (searchQuery) {
      setQuery(searchQuery);
    }

    try {
      let response;
      
      // 如果有 historyId，從歷史記錄載入（不發送新的 API 請求）
      if (historyId) {
        response = await axios.get(`/api/history/${historyId}`);
        console.log('從歷史記錄載入:', response.data.message);
      } else {
        // 否則發送新的搜尋請求
        response = await axios.get('/api/search', {
          params: {
            query: queryToSearch,
            maxResults: maxResults,
            minViewCount: minViewCount
          }
        });
      }

      setVideos(response.data.data);
    } catch (err) {
      console.error('搜尋錯誤:', err);
      if (err.response?.status === 404) {
        // 如果歷史記錄不存在，嘗試重新搜尋
        setError('歷史記錄不存在，正在重新搜尋...');
        setTimeout(() => handleSearch(searchQuery, null), 1000);
      } else {
        setError(err.response?.data?.message || '搜尋失敗，請稍後再試');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 100000000) {
      return (num / 100000000).toFixed(1) + '億';
    } else if (num >= 10000) {
      return (num / 10000).toFixed(1) + '萬';
    }
    return num.toString();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-TW');
  };

  // 載入統計資訊
  const loadStats = async () => {
    try {
      const response = await axios.get('/api/stats');
      setStats(response.data.stats);
    } catch (err) {
      console.error('載入統計資訊失敗:', err);
    }
  };

  // 載入搜尋歷史（只載入基本資訊，不包含完整影片資料）
  const loadHistory = async () => {
    try {
      const response = await axios.get('/api/history?limit=10');
      setSearchHistory(response.data.data);
    } catch (err) {
      console.error('載入搜尋歷史失敗:', err);
    }
  };

  // 清除搜尋歷史
  const clearHistory = async () => {
    try {
      await axios.delete('/api/history');
      setSearchHistory([]);
      alert('搜尋歷史已清除');
    } catch (err) {
      console.error('清除搜尋歷史失敗:', err);
      alert('清除失敗');
    }
  };

  // 組件載入時和搜尋後更新統計資訊
  useEffect(() => {
    loadStats();
    loadHistory();
  }, []);

  useEffect(() => {
    if (!loading && searchPerformed) {
      // 搜尋完成後更新統計資訊和歷史
      setTimeout(() => {
        loadStats();
        loadHistory();
      }, 500);
    }
  }, [loading, searchPerformed]);

  const drawerWidth = 320;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* 左側邊欄 - 搜尋歷史 */}
      <Drawer
        variant="persistent"
        open={sidebarOpen}
        sx={{
          width: { xs: '100%', sm: drawerWidth },
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: drawerWidth },
            boxSizing: 'border-box',
            position: { xs: 'fixed', sm: 'relative' },
            height: '100vh',
            borderRight: '1px solid rgba(0, 0, 0, 0.12)',
            zIndex: { xs: 1200, sm: 'auto' }
          },
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              搜尋歷史
            </Typography>
            <a href="/logs" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', color: 'inherit', textDecoration: 'none' }}>
              <IconButton size="small" title="查看日誌">
                <DescriptionIcon fontSize="small" />
              </IconButton>
            </a>
            <a href="/statistics" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', color: 'inherit', textDecoration: 'none' }}>
              <IconButton size="small" title="查看統計">
                <BarChartIcon fontSize="small" />
              </IconButton>
            </a>
          </Box>
          <IconButton onClick={() => setSidebarOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Toolbar>
        <Box sx={{ overflow: 'auto', p: 2 }}>
          {searchHistory.length > 0 ? (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  共 {searchHistory.length} 筆記錄
                </Typography>
                <Button
                  size="small"
                  onClick={clearHistory}
                  startIcon={<DeleteIcon />}
                  color="error"
                  variant="outlined"
                >
                  清除全部
                </Button>
              </Box>
              <List>
                {searchHistory.map((record, index) => (
                  <React.Fragment key={record.id}>
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => handleSearch(record.query, record.id)}
                        sx={{
                          borderRadius: 1,
                          mb: 0.5,
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          }
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {record.query}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {new Date(record.timestamp).toLocaleString('zh-TW')} • {record.resultCount} 部影片
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                    {index < searchHistory.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </>
          ) : (
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <HistoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                尚無搜尋記錄
              </Typography>
            </Box>
          )}
        </Box>
      </Drawer>

      {/* 主內容區域 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${sidebarOpen ? drawerWidth : 0}px)` },
          transition: 'width 0.3s',
        }}
      >
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {/* 側邊欄開關按鈕 */}
          {!sidebarOpen && (
            <IconButton
              onClick={() => setSidebarOpen(true)}
              sx={{
                position: 'fixed',
                left: 8,
                top: 8,
                zIndex: 1300,
                bgcolor: 'background.paper',
                boxShadow: 2
              }}
              aria-label="開啟搜尋歷史"
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography variant="h3" component="h1" gutterBottom align="center" color="primary">
            YouTube 高點閱影片搜尋器
          </Typography>

          <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 2 }}>
            {(() => {
              const viewCount = Number(minViewCount) || 100000000;
              const displayText = viewCount >= 100000000 
                ? `${(viewCount / 100000000).toFixed(0)} 億`
                : `${(viewCount / 10000).toFixed(0)} 萬`;
              return `尋找點閱率超過 ${displayText} 的影片`;
            })()}
          </Typography>

      {/* API 請求統計資訊 */}
      {stats && (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 4, flexWrap: 'wrap' }}>
          <Chip
            icon={<InfoIcon />}
            label={`總請求數: ${stats.totalRequests}`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`今日請求: ${stats.todayRequests}`}
            color={stats.todayRequests > 8000 ? 'error' : stats.todayRequests > 5000 ? 'warning' : 'success'}
            variant="outlined"
          />
          <Chip
            label={`配額使用: ${stats.quotaInfo.usagePercentage}`}
            color={parseFloat(stats.quotaInfo.usagePercentage) > 80 ? 'error' : parseFloat(stats.quotaInfo.usagePercentage) > 50 ? 'warning' : 'default'}
            variant="outlined"
          />
          <Chip
            label={`剩餘配額: ${stats.quotaInfo.remainingEstimate.toLocaleString()}`}
            color="default"
            variant="outlined"
          />
        </Box>
      )}

      {/* 搜尋區塊 */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
          <TextField
            fullWidth
            label="搜尋關鍵字"
            variant="outlined"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="輸入影片關鍵字..."
            sx={{ flex: '1 1 300px' }}
          />
          <FormControl variant="outlined" sx={{ minWidth: 150 }}>
            <InputLabel>結果數量</InputLabel>
            <Select
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              label="結果數量"
            >
              <MenuItem value={50}>50 筆</MenuItem>
              <MenuItem value={100}>100 筆（分頁）</MenuItem>
              <MenuItem value={150}>150 筆（分頁）</MenuItem>
              <MenuItem value={200}>200 筆（分頁）</MenuItem>
            </Select>
          </FormControl>
          <FormControl variant="outlined" sx={{ minWidth: 180 }}>
            <InputLabel>點閱率門檻</InputLabel>
            <Select
              value={minViewCount}
              onChange={(e) => setMinViewCount(Number(e.target.value))}
              label="點閱率門檻"
            >
              <MenuItem value={10000000}>1,000 萬</MenuItem>
              <MenuItem value={50000000}>5,000 萬</MenuItem>
              <MenuItem value={100000000}>1 億</MenuItem>
              <MenuItem value={200000000}>2 億</MenuItem>
              <MenuItem value={500000000}>5 億</MenuItem>
              <MenuItem value={1000000000}>10 億</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            size="large"
            onClick={handleSearch}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
            sx={{ minWidth: 120 }}
          >
            {loading ? '搜尋中' : '搜尋'}
          </Button>
        </Box>
      </Paper>

      {/* 錯誤訊息 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 搜尋結果統計 */}
      {searchPerformed && !loading && (
        <Typography variant="h6" sx={{ mb: 2 }}>
          搜尋結果：找到 {videos.length} 部符合條件的影片
        </Typography>
      )}

      {/* 載入中 */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ ml: 2, alignSelf: 'center' }}>
            正在搜尋影片...
          </Typography>
        </Box>
      )}

      {/* 影片清單 */}
      {!loading && videos.length > 0 && (
        <Grid container spacing={3}>
          {videos.map((video) => (
            <Grid item xs={12} sm={6} md={4} key={video.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="img"
                  height="180"
                  image={video.thumbnail}
                  alt={video.title}
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="h2" gutterBottom sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.3,
                    height: '2.6em'
                  }}>
                    {video.title}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {video.channelTitle}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <VisibilityIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {formatNumber(video.viewCount)}
                    </Typography>
                  </Box>

                  {video.likeCount > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <ThumbUpIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {formatNumber(video.likeCount)}
                      </Typography>
                    </Box>
                  )}

                  <Typography variant="caption" color="text.secondary">
                    發布日期：{formatDate(video.publishedAt)}
                  </Typography>
                </CardContent>

                <Box sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<PlayArrowIcon />}
                    href={video.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                  >
                    觀看影片
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 無結果 */}
      {!loading && searchPerformed && videos.length === 0 && (
        <Box sx={{ textAlign: 'center', my: 6 }}>
          <Typography variant="h6" color="text.secondary">
            沒有找到符合條件的影片
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            請嘗試不同的搜尋關鍵字，或確認影片點閱率是否超過 1 億
          </Typography>
        </Box>
      )}
        </Container>
      </Box>
    </Box>
  );
}

export default App;
