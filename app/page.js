'use client';

import { useState, useCallback, useEffect } from 'react';
import { 
  Search, 
  DarkMode,
  AccountCircle,
  PlayArrow
} from '@mui/icons-material';
import { 
  IconButton, 
  InputAdornment, 
  TextField, 
  Button,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Grid,
  CircularProgress,
  Skeleton
} from '@mui/material';
import { searchMusic, getMusicUrl, getHotSongs } from './services/musicApi';
import MusicPlayer from './components/MusicPlayer';
import MusicIcon from './components/MusicIcon';
import { useTheme } from './contexts/ThemeContext';
import MobileNav from './components/MobileNav';
import Sidebar from './components/Sidebar';

export default function HomePage() {
  const { isDarkMode, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [error, setError] = useState('');
  const [hotSongs, setHotSongs] = useState([]);
  const [displaySongs, setDisplaySongs] = useState([]);
  const [isLoadingHotSongs, setIsLoadingHotSongs] = useState(true);

  // 获取热门歌曲并随机选择12首
  useEffect(() => {
    const fetchHotSongs = async () => {
      try {
        const songs = await getHotSongs(50);
        setHotSongs(songs);
        // 随机选择12首歌曲
        const shuffledSongs = [...songs].sort(() => Math.random() - 0.5);
        setDisplaySongs(shuffledSongs.slice(0, 12));
      } catch (err) {
        console.error('获取热门歌曲失败:', err);
        setError('获取热门歌曲失败，请稍后重试');
      } finally {
        setIsLoadingHotSongs(false);
      }
    };

    fetchHotSongs();
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError('');
    try {
      const results = await searchMusic(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error('搜索失败:', err);
      setError('搜索失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePlaySong = async (song) => {
    try {
      const url = await getMusicUrl(song.id);
      if (url) {
        setCurrentSong({ ...song, url });
      } else {
        setError('无法播放该歌曲，请尝试其他歌曲');
      }
    } catch (err) {
      console.error('获取音乐URL失败:', err);
      setError('获取音乐URL失败，请稍后重试');
    }
  };

  const renderSongCard = (song) => (
    <Grid item xs={12} sm={6} md={3} key={song.id}>
      <Card 
        className="song-card"
        onClick={() => handlePlaySong(song)}
      >
        <div className="card-media-container">
          {song.album?.picUrl ? (
            <CardMedia
              component="img"
              height="180"
              image={song.album.picUrl}
              alt={song.name}
              className="song-cover"
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
          <Typography variant="subtitle1" className="song-title" noWrap>
            {song.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {song.artists?.map(artist => artist.name).join(', ')}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );

  return (
    <div className={`app-container ${isDarkMode ? 'dark-theme' : ''}`}>
      <Sidebar />
      <main className="main-content">
        <header className="top-header">
          <div className="search-box">
            <TextField
              fullWidth
              placeholder="搜索音乐、艺术家或专辑..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              variant="outlined"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <Button 
              variant="contained" 
              className="search-btn"
              onClick={handleSearch}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : '搜索'}
            </Button>
          </div>
          <div className="user-actions">
            <IconButton 
              className="theme-toggle" 
              onClick={toggleTheme}
              title={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
            >
              <DarkMode />
            </IconButton>
            <IconButton className="user-avatar">
              <AccountCircle />
            </IconButton>
          </div>
        </header>

        <div className="content-area">
          {error && (
            <Typography color="error" className="error-message">
              {error}
            </Typography>
          )}

          {searchResults.length > 0 ? (
            <Grid container spacing={2} className="search-results">
              {searchResults.map(renderSongCard)}
            </Grid>
          ) : !isLoading && searchQuery && (
            <div className="no-results">
              <Typography variant="h6" color="text.secondary">
                未找到相关歌曲
              </Typography>
            </div>
          )}

          {!searchQuery && (
            <section className="featured">
              <div className="section-header">
                <h2>推荐歌单</h2>
                <Button
                  href="/playlists"
                  variant="text"
                  className="view-all"
                >
                  查看全部
                </Button>
              </div>
              <Grid container spacing={2} className="song-grid">
                {isLoadingHotSongs ? (
                  // 加载骨架屏 - 4x3布局
                  Array.from(new Array(12)).map((_, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                      <Card className="song-card">
                        <Skeleton variant="rectangular" height={160} />
                        <CardContent>
                          <Skeleton variant="text" width="80%" />
                          <Skeleton variant="text" width="60%" />
                        </CardContent>
                      </Card>
                    </Grid>
                  ))
                ) : (
                  displaySongs.map(renderSongCard)
                )}
              </Grid>
            </section>
          )}
        </div>
      </main>
      <MobileNav />
      {currentSong && (
        <MusicPlayer
          currentSong={currentSong}
          onNext={() => {/* 实现下一首逻辑 */}}
          onPrevious={() => {/* 实现上一首逻辑 */}}
        />
      )}
    </div>
  );
}
