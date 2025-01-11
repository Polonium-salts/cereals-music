'use client';

import { useState, useEffect } from 'react';
import { 
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Skeleton,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Pagination,
  CircularProgress
} from '@mui/material';
import { PlayArrow, Favorite, MoreVert } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import MusicIcon from '../components/MusicIcon';
import { getPlaylists, getPlaylistCategories } from '../services/musicApi';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';

export default function PlaylistsPage() {
  const { isDarkMode } = useTheme();
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 32; // 每页显示数量

  // 获取歌单分类
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getPlaylistCategories();
        const allCategory = { id: '全部', name: '全部' };
        const hotCategories = data.subCategories
          .filter(cat => cat.hot)
          .map(cat => ({ id: cat.name, name: cat.name }));
        setCategories([allCategory, ...hotCategories]);
      } catch (err) {
        console.error('获取歌单分类失败:', err);
      }
    };

    fetchCategories();
  }, []);

  // 获取歌单列表
  useEffect(() => {
    const fetchPlaylists = async () => {
      setIsLoading(true);
      setError('');
      try {
        const offset = (page - 1) * limit;
        const data = await getPlaylists({
          limit,
          offset,
          cat: selectedCategory
        });
        setPlaylists(data.playlists);
        setTotal(Math.ceil(data.total / limit));
      } catch (err) {
        console.error('获取歌单失败:', err);
        setError('获取歌单失败，请稍后重试');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylists();
  }, [selectedCategory, page]);

  // 处理分类切换
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setPage(1); // 重置页码
  };

  // 处理页码变化
  const handlePageChange = (event, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPlaylistCard = (playlist) => (
    <Grid item xs={12} sm={6} md={3} key={playlist.id}>
      <Card className="playlist-card">
        <div className="card-media-container">
          {playlist.coverUrl ? (
            <CardMedia
              component="img"
              height="180"
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
        </div>
        <CardContent>
          <Typography variant="subtitle1" className="playlist-title" noWrap>
            {playlist.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {playlist.songCount} 首歌曲 · {playlist.playCount.toLocaleString()} 次播放
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            by {playlist.creator.name}
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

  return (
    <div className={`app-container ${isDarkMode ? 'dark-theme' : ''}`}>
      <Sidebar />
      <main className="main-content">
        <div className="content-area">
          <div className="section-header">
            <Typography variant="h5" component="h1">
              歌单广场
            </Typography>
          </div>
          
          <Stack direction="row" spacing={1} className="category-chips" sx={{ mb: 3 }}>
            {categories.map(category => (
              <Chip
                key={category.id}
                label={category.name}
                onClick={() => handleCategoryChange(category.id)}
                color={selectedCategory === category.id ? 'primary' : 'default'}
                variant={selectedCategory === category.id ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>

          {error && (
            <Typography color="error" sx={{ my: 2 }}>
              {error}
            </Typography>
          )}

          <Grid container spacing={2}>
            {isLoading
              ? Array.from(new Array(8)).map((_, index) => (
                  <Grid item xs={12} sm={6} md={3} key={index}>
                    <Card>
                      <Skeleton variant="rectangular" height={180} />
                      <CardContent>
                        <Skeleton variant="text" width="80%" />
                        <Skeleton variant="text" width="60%" />
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              : playlists.map(renderPlaylistCard)}
          </Grid>

          {!isLoading && total > 1 && (
            <Stack alignItems="center" sx={{ mt: 4, mb: 2 }}>
              <Pagination
                count={total}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size="large"
              />
            </Stack>
          )}
        </div>
      </main>
      <MobileNav />
    </div>
  );
} 