'use client';

import { useState, useCallback } from 'react';
import { 
  Home as HomeIcon, 
  Search, 
  LibraryMusic, 
  Person, 
  Album, 
  Favorite, 
  PlaylistPlay, 
  History,
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
  CircularProgress
} from '@mui/material';
import { searchMusic, getMusicUrl } from './services/musicApi';
import MusicPlayer from './components/MusicPlayer';
import MusicIcon from './components/MusicIcon';

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [error, setError] = useState('');

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

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="logo">
          <LibraryMusic className="logo-icon" />
          MusicHub
        </div>
        <nav className="side-nav">
          <div className="nav-group">
            <h3>音乐馆</h3>
            <a href="/discover" className="nav-item">
              <HomeIcon className="nav-icon" />
              发现音乐
            </a>
            <a href="/playlists" className="nav-item">
              <PlaylistPlay className="nav-icon" />
              推荐歌单
            </a>
            <a href="/artists" className="nav-item">
              <Person className="nav-icon" />
              艺术家
            </a>
            <a href="/albums" className="nav-item">
              <Album className="nav-icon" />
              新碟上架
            </a>
          </div>
          <div className="nav-group">
            <h3>我的音乐</h3>
            <a href="/my/likes" className="nav-item">
              <Favorite className="nav-icon" />
              我喜欢的
            </a>
            <a href="/my/playlists" className="nav-item">
              <PlaylistPlay className="nav-icon" />
              我的歌单
            </a>
            <a href="/my/history" className="nav-item">
              <History className="nav-icon" />
              最近播放
            </a>
          </div>
        </nav>
      </aside>

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
            <IconButton className="theme-toggle">
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
              {searchResults.map((song) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={song.id}>
                  <Card 
                    className="song-card"
                    onClick={() => handlePlaySong(song)}
                  >
                    <div className="card-media-container">
                      {song.album?.picUrl ? (
                        <CardMedia
                          component="img"
                          height="160"
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
                      <Typography variant="subtitle1" className="song-title">
                        {song.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {song.artists?.map(artist => artist.name).join(', ')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
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
                  endIcon={<PlaylistPlay />}
                >
                  查看全部
                </Button>
              </div>
              <div className="playlist-grid">
                {/* 这里将通过API获取数据 */}
              </div>
            </section>
          )}
        </div>

        {currentSong && (
          <MusicPlayer
            currentSong={currentSong}
            onNext={() => {/* 实现下一首逻辑 */}}
            onPrevious={() => {/* 实现上一首逻辑 */}}
          />
        )}
      </main>
    </div>
  );
}
