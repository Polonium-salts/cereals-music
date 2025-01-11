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
  Button,
  Menu,
  MenuItem
} from '@mui/material';
import { PlayArrow, Favorite, MoreVert, KeyboardArrowDown, YouTube, CloudQueue } from '@mui/icons-material';
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
  const [anchorEl, setAnchorEl] = useState(null);
  const [subCategories, setSubCategories] = useState([]);

  // 获取分类数据
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getPlaylistCategories();
        setCategories(data);
        // 设置第一个分类的子分类
        if (data.length > 0) {
          setSubCategories(['全部', ...data[0].subs.map(sub => sub.name)]);
        }
      } catch (err) {
        console.error('获取分类失败:', err);
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
        const data = await getPlaylists(50, selectedCategory);
        setPlaylists(data);
      } catch (err) {
        console.error('获取歌单失败:', err);
        setError('获取歌单失败，请稍后重试');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylists();
  }, [selectedCategory]);

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

  const renderPlaylistCard = (playlist) => (
    <Grid item xs={12} sm={6} md={3} key={`${playlist.platform}-${playlist.id}`}>
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
          <Chip
            icon={playlist.platform === 'netease' ? <CloudQueue /> : <YouTube />}
            label={playlist.platform === 'netease' ? '网易云' : '酷狗'}
            className={`platform-chip ${playlist.platform}`}
            size="small"
          />
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
        </div>
      </main>
      <MobileNav />
    </div>
  );
} 