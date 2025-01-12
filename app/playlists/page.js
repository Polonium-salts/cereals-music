'use client';

import { useState, useEffect } from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  CardMedia, 
  Typography, 
  Button, 
  Menu, 
  MenuItem,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  TextField,
  InputAdornment,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Box
} from '@mui/material';
import { 
  PlayArrow, 
  KeyboardArrowDown, 
  Favorite,
  MoreVert,
  CloudQueue,
  YouTube,
  MusicNote as MusicIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { getPlaylists, getPlaylistCategories, getPlaylistSuggestions } from '../services/musicApi';
import { useTheme } from '../contexts/ThemeContext';
import Sidebar from '../components/Sidebar';
import { useRouter } from 'next/navigation';

export default function PlaylistsPage() {
  const { isDarkMode } = useTheme();
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [subCategories, setSubCategories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 32; // 每页显示32个歌单
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSearchTips, setShowSearchTips] = useState(false);
  const router = useRouter();

  // 获取分类数据
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getPlaylistCategories();
        setCategories(data);
        if (data.length > 0) {
          setSubCategories(['全部', ...data[0].subs.map(sub => sub.name)]);
        }
      } catch (err) {
        console.error('获取分类失败:', err);
        setError('获取分类失败，请稍后重试');
      }
    };
    fetchCategories();
  }, []);

  // 获取歌单数据
  useEffect(() => {
    const fetchPlaylists = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await getPlaylists(pageSize, selectedCategory);
        setPlaylists(data);
        setHasMore(data.length === pageSize);
      } catch (err) {
        console.error('获取歌单失败:', err);
        setError('获取歌单失败，请稍后重试');
      } finally {
        setIsLoading(false);
      }
    };

    setCurrentPage(1);
    fetchPlaylists();
  }, [selectedCategory]);

  // 加载更多歌单
  const loadMorePlaylists = async () => {
    if (!hasMore || isLoading) return;

    setIsLoading(true);
    try {
      const offset = currentPage * pageSize;
      const data = await getPlaylists(pageSize, selectedCategory, offset);
      setPlaylists(prev => [...prev, ...data]);
      setHasMore(data.length === pageSize);
      setCurrentPage(prev => prev + 1);
    } catch (err) {
      console.error('加载更多歌单失败:', err);
      setError('加载更多失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCategoryClose = () => {
    setAnchorEl(null);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    handleCategoryClose();
  };

  const formatPlayCount = (count) => {
    if (count >= 100000000) {
      return `${Math.floor(count / 100000000)}亿`;
    }
    if (count >= 10000) {
      return `${Math.floor(count / 10000)}万`;
    }
    return count.toString();
  };

  const renderPlaylistCard = (playlist) => (
    <Grid item xs={12} sm={6} md={4} lg={3} key={playlist.id}>
      <Card className="playlist-card">
        <div className="card-media-container">
          {playlist.coverUrl ? (
            <CardMedia
              component="img"
              image={playlist.coverUrl}
              alt={playlist.name}
              className="playlist-cover"
            />
          ) : (
            <div className="default-cover">
              <MusicIcon />
            </div>
          )}
          <div className="play-overlay">
            <PlayArrow className="play-icon" />
          </div>
          <div className="playlist-info-overlay">
            <Typography variant="body2" className="play-count">
              ▶ {formatPlayCount(playlist.playCount)}
            </Typography>
          </div>
        </div>
        <CardContent>
          <Typography variant="subtitle1" className="playlist-title" noWrap>
            {playlist.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {playlist.songCount} 首歌曲 · by {playlist.creator.name}
          </Typography>
          <div className="playlist-actions">
            <Tooltip title="收藏">
              <IconButton size="small">
                <Favorite fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="更多">
              <IconButton size="small">
                <MoreVert fontSize="small" />
              </IconButton>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </Grid>
  );

  // 搜索歌单
  const searchPlaylists = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await getPlaylists(pageSize, selectedCategory, 0, query);
      setSearchResults(results);
    } catch (err) {
      console.error('搜索歌单失败:', err);
      setError('搜索失败，请稍后重试');
    } finally {
      setIsSearching(false);
    }
  };

  // 获取搜索建议
  const fetchSearchSuggestions = async (query) => {
    if (!query.trim()) {
      setSearchSuggestions([]);
      return;
    }

    try {
      const suggestions = await getPlaylistSuggestions(query);
      setSearchSuggestions(suggestions);
    } catch (err) {
      console.error('获取搜索建议失败:', err);
    }
  };

  // 处理搜索输入
  const handleSearchChange = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
    
    // 使用防抖获取搜索建议
    const timeoutId = setTimeout(() => {
      fetchSearchSuggestions(query);
    }, 300);

    // 使用防抖进行搜索
    const searchTimeoutId = setTimeout(() => {
      searchPlaylists(query);
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(searchTimeoutId);
    };
  };

  // 显示搜索提示
  const handleSearchFocus = () => {
    setShowSearchTips(true);
  };

  // 处理搜索建议点击
  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    searchPlaylists(suggestion);
    setSearchSuggestions([]);
  };

  // 清除搜索
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className={`app-container ${isDarkMode ? 'dark-theme' : ''}`}>
      <Sidebar />
      <main className="main-content">
        <div className="content-area">
          <div className="section-header">
            <Typography variant="h5" component="h1">
              歌单广场
            </Typography>
            <div className="search-and-filter">
              <Autocomplete
                freeSolo
                options={searchSuggestions}
                value={searchQuery}
                onChange={(event, newValue) => {
                  if (newValue) {
                    setSearchQuery(newValue);
                    searchPlaylists(newValue);
                  }
                }}
                onInputChange={(event, newValue) => {
                  handleSearchChange({ target: { value: newValue } });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder="搜索歌单..."
                    onFocus={handleSearchFocus}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                      endAdornment: searchQuery && (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={handleClearSearch}
                            edge="end"
                          >
                            <ClearIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
                sx={{ width: 300, mr: 2 }}
              />
              <div className="category-selector">
                <Button
                  endIcon={<KeyboardArrowDown />}
                  onClick={handleCategoryClick}
                  variant="outlined"
                  size="small"
                >
                  {selectedCategory}
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleCategoryClose}
                  PaperProps={{
                    style: {
                      maxHeight: 300,
                      width: 200,
                    }
                  }}
                >
                  {subCategories.map((category) => (
                    <MenuItem
                      key={category}
                      onClick={() => handleCategorySelect(category)}
                      selected={category === selectedCategory}
                    >
                      {category}
                    </MenuItem>
                  ))}
                </Menu>
              </div>
            </div>
          </div>

          {showSearchTips && !searchQuery && (
            <Box className="search-tips" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                搜索提示:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • 输入歌单名称、创建者或标签进行搜索
                <br />
                • 使用空格分隔多个关键词
                <br />
                • 支持模糊搜索
              </Typography>
            </Box>
          )}

          {error && (
            <Typography color="error" className="error-message">
              {error}
            </Typography>
          )}

          <Grid container spacing={2} className="playlists-grid">
            {(searchQuery ? searchResults : playlists).map(renderPlaylistCard)}
          </Grid>

          {!searchQuery && hasMore && (
            <div className="load-more">
              <Button
                variant="outlined"
                onClick={loadMorePlaylists}
                disabled={isLoading}
                className="load-more-btn"
              >
                {isLoading ? <CircularProgress size={24} /> : '加载更多'}
              </Button>
            </div>
          )}

          {/* 创建歌单按钮 */}
          <Fab
            color="primary"
            className="create-playlist-fab"
            onClick={() => router.push('/playlists/create')}
          >
            <AddIcon />
          </Fab>
        </div>
      </main>
    </div>
  );
} 