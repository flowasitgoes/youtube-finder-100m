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
  InputLabel,
  useMediaQuery
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
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
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import axios from 'axios';

// 粒子背景组件
const ParticleBackground = () => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    left: Math.random() * 100,
    delay: Math.random() * 20,
    duration: Math.random() * 10 + 15
  }));

  return (
    <div className="particles">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="particle"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.left}%`,
          }}
          animate={{
            y: [-100, window.innerHeight + 100],
            x: [0, Math.random() * 200 - 100],
            rotate: 360,
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

function App() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [query, setQuery] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [stats, setStats] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [maxResults, setMaxResults] = useState(100);
  const [minViewCount, setMinViewCount] = useState(100000000);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

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
      
      if (historyId) {
        response = await axios.get(`/api/history/${historyId}`);
        console.log('從歷史記錄載入:', response.data.message);
      } else {
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
        setError('歷史記錄不存在，正在重新搜尋...');
        setTimeout(() => handleSearch(searchQuery, null), 1000);
      } else if (err.response?.status === 403 || err.response?.data?.quotaExceeded) {
        setError('YouTube API 配額已用盡。每日配額為 10,000 單位，請等待明天重置，或使用左側的搜尋歷史查看之前的結果。');
      } else {
        setError(err.response?.data?.message || err.message || '搜尋失敗，請稍後再試');
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

  const loadStats = async () => {
    try {
      const response = await axios.get('/api/stats');
      setStats(response.data.stats);
    } catch (err) {
      console.error('載入統計資訊失敗:', err);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await axios.get('/api/history?limit=10');
      setSearchHistory(response.data.data);
    } catch (err) {
      console.error('載入搜尋歷史失敗:', err);
    }
  };

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

  useEffect(() => {
    loadStats();
    loadHistory();
  }, []);

  useEffect(() => {
    if (!loading && searchPerformed) {
      setTimeout(() => {
        loadStats();
        loadHistory();
      }, 500);
    }
  }, [loading, searchPerformed]);

  const drawerWidth = 320;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <ParticleBackground />
      
      {/* 左側邊欄 - 搜尋歷史 */}
      <Drawer
        variant={isMobile ? "temporary" : "persistent"}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sx={{
          width: { xs: '100%', sm: drawerWidth },
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: drawerWidth },
            boxSizing: 'border-box',
            position: { xs: 'fixed', sm: 'relative' },
            height: '100vh',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderRight: '1px solid rgba(255, 255, 255, 0.2)',
            zIndex: { xs: 1200, sm: 'auto' },
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          },
        }}
      >
        <Toolbar sx={{ 
          justifyContent: 'space-between', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          background: 'rgba(255, 255, 255, 0.05)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
              搜尋歷史
            </Typography>
            <a href="/logs" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', color: 'inherit', textDecoration: 'none' }}>
              <IconButton size="small" sx={{ color: 'rgba(255, 255, 255, 0.8)' }} title="查看日誌">
                <DescriptionIcon fontSize="small" />
              </IconButton>
            </a>
            <a href="/statistics" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', color: 'inherit', textDecoration: 'none' }}>
              <IconButton size="small" sx={{ color: 'rgba(255, 255, 255, 0.8)' }} title="查看統計">
                <BarChartIcon fontSize="small" />
              </IconButton>
            </a>
          </Box>
          <IconButton onClick={() => setSidebarOpen(false)} sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            <CloseIcon />
          </IconButton>
        </Toolbar>
        <Box sx={{ overflow: 'auto', p: 2 }}>
          {searchHistory.length > 0 ? (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  共 {searchHistory.length} 筆記錄
                </Typography>
                <Button
                  size="small"
                  onClick={clearHistory}
                  startIcon={<DeleteIcon />}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      background: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                  variant="outlined"
                >
                  清除全部
                </Button>
              </Box>
              <List>
                {searchHistory.map((record, index) => (
                  <React.Fragment key={record.id}>
                    <ListItem disablePadding>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{ width: '100%' }}
                      >
                        <ListItemButton
                          onClick={() => handleSearch(record.query, record.id)}
                          sx={{
                            borderRadius: 2,
                            mb: 0.5,
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            '&:hover': {
                              background: 'rgba(255, 255, 255, 0.15)',
                              borderColor: 'rgba(255, 255, 255, 0.3)',
                            },
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <ListItemText
                            primary={
                              <Typography variant="body1" sx={{ fontWeight: 600, color: 'white' }}>
                                {record.query}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                {new Date(record.timestamp).toLocaleString('zh-TW')} • {record.resultCount} 部影片
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      </motion.div>
                    </ListItem>
                    {index < searchHistory.length - 1 && <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />}
                  </React.Fragment>
                ))}
              </List>
            </>
          ) : (
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <HistoryIcon sx={{ fontSize: 48, color: 'rgba(255, 255, 255, 0.5)', mb: 2 }} />
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
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
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          zIndex: 1
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
          {!sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <IconButton
                onClick={() => setSidebarOpen(true)}
                sx={{
                  position: 'fixed',
                  left: 8,
                  top: 8,
                  zIndex: 1300,
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.25)',
                  }
                }}
                aria-label="開啟搜尋歷史"
              >
                <MenuIcon />
              </IconButton>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Typography 
              variant="h2" 
              component="h1" 
              gutterBottom 
              align="center" 
              sx={{
                fontWeight: 800,
                background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                mb: 2,
                textShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                fontSize: { xs: '2rem', md: '3rem' }
              }}
            >
              YouTube 高點閱影片搜尋器
            </Typography>

            <Typography 
              variant="h6" 
              align="center" 
              sx={{ 
                mb: 4,
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: 400,
                fontSize: { xs: '0.9rem', md: '1.1rem' }
              }}
            >
              {(() => {
                const viewCount = Number(minViewCount) || 100000000;
                const displayText = viewCount >= 100000000 
                  ? `${(viewCount / 100000000).toFixed(0)} 億`
                  : `${(viewCount / 10000).toFixed(0)} 萬`;
                return `尋找點閱率超過 ${displayText} 的影片`;
              })()}
            </Typography>
          </motion.div>

          {/* API 請求統計資訊 */}
          {stats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mb: 4, flexWrap: 'wrap' }}>
                {[
                  { icon: <InfoIcon />, label: `總請求數: ${stats.totalRequests}`, color: 'primary' },
                  { 
                    label: `今日請求: ${stats.todayRequests}`, 
                    color: stats.todayRequests > 8000 ? 'error' : stats.todayRequests > 5000 ? 'warning' : 'success' 
                  },
                  { 
                    label: `配額使用: ${stats.quotaInfo.usagePercentage}`, 
                    color: parseFloat(stats.quotaInfo.usagePercentage) > 80 ? 'error' : parseFloat(stats.quotaInfo.usagePercentage) > 50 ? 'warning' : 'default' 
                  },
                  { label: `剩餘配額: ${stats.quotaInfo.remainingEstimate.toLocaleString()}`, color: 'default' }
                ].map((chip, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Chip
                      icon={chip.icon}
                      label={chip.label}
                      sx={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        fontWeight: 500,
                        '& .MuiChip-icon': {
                          color: 'rgba(255, 255, 255, 0.8)'
                        }
                      }}
                    />
                  </motion.div>
                ))}
              </Box>
            </motion.div>
          )}

          {/* 搜尋區塊 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Paper 
              elevation={0}
              sx={{ 
                p: { xs: 2, sm: 4 }, 
                mb: { xs: 2, sm: 4 },
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 4,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
              }}
            >
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap', flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  fullWidth
                  label="搜尋關鍵字"
                  variant="outlined"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="輸入影片關鍵字..."
                  sx={{ 
                    flex: { xs: '1 1 auto', sm: '1 1 300px' },
                    width: { xs: '100%', sm: 'auto' },
                    '& .MuiOutlinedInput-root': {
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      color: 'white',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.7)',
                        borderWidth: 2,
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: 'rgba(255, 255, 255, 0.9)',
                    },
                    '& input': {
                      color: 'white',
                    }
                  }}
                />
                <FormControl 
                  variant="outlined" 
                  sx={{ 
                    minWidth: { xs: '100%', sm: 150 },
                    width: { xs: '100%', sm: 'auto' },
                    '& .MuiOutlinedInput-root': {
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      color: 'white',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.7)',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: 'rgba(255, 255, 255, 0.9)',
                    },
                    '& .MuiSelect-icon': {
                      color: 'rgba(255, 255, 255, 0.7)',
                    }
                  }}
                >
                  <InputLabel>結果數量</InputLabel>
                  <Select
                    value={maxResults}
                    onChange={(e) => setMaxResults(Number(e.target.value))}
                    label="結果數量"
                    sx={{ color: 'white' }}
                  >
                    <MenuItem value={50}>50 筆</MenuItem>
                    <MenuItem value={100}>100 筆（分頁）</MenuItem>
                    <MenuItem value={150}>150 筆（分頁）</MenuItem>
                    <MenuItem value={200}>200 筆（分頁）</MenuItem>
                  </Select>
                </FormControl>
                <FormControl 
                  variant="outlined" 
                  sx={{ 
                    minWidth: { xs: '100%', sm: 180 },
                    width: { xs: '100%', sm: 'auto' },
                    '& .MuiOutlinedInput-root': {
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      color: 'white',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.7)',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: 'rgba(255, 255, 255, 0.9)',
                    },
                    '& .MuiSelect-icon': {
                      color: 'rgba(255, 255, 255, 0.7)',
                    }
                  }}
                >
                  <InputLabel>點閱率門檻</InputLabel>
                  <Select
                    value={minViewCount}
                    onChange={(e) => setMinViewCount(Number(e.target.value))}
                    label="點閱率門檻"
                    sx={{ color: 'white' }}
                  >
                    <MenuItem value={10000000}>1,000 萬</MenuItem>
                    <MenuItem value={50000000}>5,000 萬</MenuItem>
                    <MenuItem value={100000000}>1 億</MenuItem>
                    <MenuItem value={200000000}>2 億</MenuItem>
                    <MenuItem value={500000000}>5 億</MenuItem>
                    <MenuItem value={1000000000}>10 億</MenuItem>
                  </Select>
                </FormControl>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleSearch}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                    sx={{ 
                      minWidth: { xs: '100%', sm: 120 },
                      width: { xs: '100%', sm: 'auto' },
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: 2,
                      px: 3,
                      py: 1.5,
                      boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                        boxShadow: '0 12px 32px rgba(102, 126, 234, 0.6)',
                        transform: 'translateY(-2px)',
                      },
                      '&:disabled': {
                        background: 'rgba(255, 255, 255, 0.2)',
                      },
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    {loading ? '搜尋中' : '搜尋'}
                  </Button>
                </motion.div>
              </Box>
            </Paper>
          </motion.div>

          {/* 錯誤訊息 */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    background: 'rgba(211, 47, 47, 0.2)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(211, 47, 47, 0.3)',
                    color: 'white',
                    borderRadius: 2
                  }}
                >
                  {error}
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 搜尋結果統計 */}
          {searchPerformed && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <TrendingUpIcon sx={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 28 }} />
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 600,
                    color: 'white',
                    textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  搜尋結果：找到 {videos.length} 部符合條件的影片
                </Typography>
              </Box>
            </motion.div>
          )}

          {/* 載入中 */}
          {loading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', my: 8 }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <CircularProgress 
                  size={60} 
                  sx={{ 
                    color: 'white',
                    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))'
                  }} 
                />
              </motion.div>
              <Typography 
                variant="h6" 
                sx={{ 
                  mt: 3,
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: 500
                }}
              >
                正在搜尋影片...
              </Typography>
            </Box>
          )}

          {/* 影片清單 */}
          {!loading && videos.length > 0 && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <Grid container spacing={{ xs: 2, sm: 3 }}>
                {videos.map((video, index) => (
                  <Grid item xs={12} sm={6} md={4} key={video.id}>
                    <motion.div
                      variants={itemVariants}
                      whileHover={{ y: -8, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card 
                        sx={{ 
                          height: '100%', 
                          display: 'flex', 
                          flexDirection: 'column',
                          background: 'rgba(255, 255, 255, 0.08)',
                          backdropFilter: 'blur(15px) saturate(150%)',
                          WebkitBackdropFilter: 'blur(15px) saturate(150%)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: 3,
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
                          overflow: 'hidden',
                          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            boxShadow: '0 16px 48px rgba(102, 126, 234, 0.4)',
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                          }
                        }}
                      >
                        <Box sx={{ position: 'relative', overflow: 'hidden' }}>
                          <CardMedia
                            component="img"
                            height="180"
                            image={video.thumbnail}
                            alt={video.title}
                            sx={{ 
                              objectFit: 'cover',
                              transition: 'transform 0.5s ease',
                              '&:hover': {
                                transform: 'scale(1.1)'
                              }
                            }}
                          />
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 100%)',
                              pointerEvents: 'none'
                            }}
                          />
                        </Box>
                        <CardContent sx={{ flexGrow: 1, background: 'transparent' }}>
                          <Typography 
                            variant="h6" 
                            component="h2" 
                            gutterBottom 
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: 1.3,
                              height: '2.6em',
                              color: 'white',
                              fontWeight: 600
                            }}
                          >
                            {video.title}
                          </Typography>

                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: 'rgba(255, 255, 255, 0.7)',
                              mb: 1.5,
                              fontWeight: 500
                            }} 
                            gutterBottom
                          >
                            {video.channelTitle}
                          </Typography>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <VisibilityIcon fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.8)' }} />
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500 }}>
                              {formatNumber(video.viewCount)}
                            </Typography>
                          </Box>

                          {video.likeCount > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <ThumbUpIcon fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.8)' }} />
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500 }}>
                                {formatNumber(video.likeCount)}
                              </Typography>
                            </Box>
                          )}

                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'rgba(255, 255, 255, 0.6)',
                              display: 'block',
                              mt: 1
                            }}
                          >
                            發布日期：{formatDate(video.publishedAt)}
                          </Typography>
                        </CardContent>

                        <Box sx={{ p: 2, pt: 0 }}>
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Button
                              variant="contained"
                              fullWidth
                              startIcon={<PlayArrowIcon />}
                              href={video.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="medium"
                              sx={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                fontWeight: 600,
                                textTransform: 'none',
                                borderRadius: 2,
                                py: 1.2,
                                boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
                                '&:hover': {
                                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                                  boxShadow: '0 8px 24px rgba(102, 126, 234, 0.6)',
                                },
                                transition: 'all 0.3s ease'
                              }}
                            >
                              觀看影片
                            </Button>
                          </motion.div>
                        </Box>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            </motion.div>
          )}

          {/* 無結果 */}
          {!loading && searchPerformed && videos.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Box sx={{ textAlign: 'center', my: 8 }}>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontWeight: 600,
                    mb: 2
                  }}
                >
                  沒有找到符合條件的影片
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}
                >
                  請嘗試不同的搜尋關鍵字，或確認影片點閱率是否超過 1 億
                </Typography>
              </Box>
            </motion.div>
          )}
        </Container>
      </Box>
    </Box>
  );
}

export default App;
