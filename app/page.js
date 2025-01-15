'use client';

import { useState, useCallback, useEffect } from 'react';
import { 
  Search, 
  DarkMode,
  AccountCircle,
  PlayArrow,
  GridView,
  ViewList,
  MoreVert,
  YouTube,
  CloudQueue
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
  Skeleton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  ListItemSecondaryAction,
  Tooltip,
  Chip
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
  const [viewMode, setViewMode] = useState('list'); // 'grid' or 'list'

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
    <Grid item xs={12} sm={6} md={3} key={`${song.platform}-${song.id}`}>
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
          <Chip
            icon={song.platform === 'netease' ? <CloudQueue /> : <YouTube />}
            className={`platform-chip ${song.platform}`}
            size="small"
          />
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

  const renderListItem = (song) => (
    <ListItem 
      key={`${song.platform}-${song.id}`}
      className="song-list-item"
      onClick={() => handlePlaySong(song)}
    >
      <ListItemAvatar>
        {song.album?.picUrl ? (
          <Avatar 
            src={song.album.picUrl} 
            alt={song.name}
            variant="rounded"
            className="song-list-cover"
          />
        ) : (
          <Avatar variant="rounded" className="song-list-cover">
            <MusicIcon />
          </Avatar>
        )}
      </ListItemAvatar>
      <ListItemText
        primary={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {song.name}
            <Chip
              icon={song.platform === 'netease' ? <CloudQueue /> : <YouTube />}
              className={`platform-chip ${song.platform}`}
              size="small"
            />
          </div>
        }
        secondary={song.artists?.map(artist => artist.name).join(', ')}
        className="song-list-text"
      />
      <ListItemSecondaryAction>
        <IconButton edge="end" className="song-list-play">
          <PlayArrow />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  );

  const renderSongGrid = (songs) => (
    <Grid container spacing={2} className="song-grid">
      {songs.map(renderSongCard)}
    </Grid>
  );

  const renderSongList = (songs) => (
    <List className="song-list">
      {songs.map(renderListItem)}
    </List>
  );

  return (
    <div className={`app-container ${isDarkMode ? 'dark-theme' : ''}`}>
      <Sidebar />
      <main className="main-content">
        <header className="top-header">
          <div className="search-box">
            <TextField
              fullWidth
              placeholder="搜索音乐、歌手、专辑..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="search-input"
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
              onClick={handleSearch}
              disabled={isLoading}
              className="search-btn"
              sx={{
                minWidth: 'unset',
                width: '44px',
                height: '44px',
                borderRadius: '22px',
                padding: 0,
                marginLeft: '8px'
              }}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <Search />
              )}
            </Button>
          </div>
          <div className="header-buttons">
            <IconButton 
              className="header-button"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              title={viewMode === 'grid' ? '切换到列表视图' : '切换到网格视图'}
            >
              {viewMode === 'grid' ? <ViewList /> : <GridView />}
            </IconButton>
            <IconButton 
              className="header-button"
              onClick={toggleTheme}
              title={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
            >
              <DarkMode />
            </IconButton>
            <IconButton className="header-button" title="用户中心">
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
            viewMode === 'grid' ? (
              renderSongGrid(searchResults)
            ) : (
              renderSongList(searchResults)
            )
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
                <div className="section-actions">
                  <Tooltip title={viewMode === 'grid' ? '切换到列表视图' : '切换到网格视图'}>
                    <IconButton 
                      onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                      className="view-mode-toggle"
                    >
                      {viewMode === 'grid' ? <ViewList /> : <GridView />}
                    </IconButton>
                  </Tooltip>
                  <Button
                    href="/playlists"
                    variant="text"
                    className="view-all"
                  >
                    查看全部
                  </Button>
                </div>
              </div>
              {isLoadingHotSongs ? (
                viewMode === 'grid' ? (
                  <Grid container spacing={2} className="song-grid">
                    {Array.from(new Array(12)).map((_, index) => (
                      <Grid item xs={12} sm={6} md={3} key={index}>
                        <Card className="song-card">
                          <Skeleton variant="rectangular" height={160} />
                          <CardContent>
                            <Skeleton variant="text" width="80%" />
                            <Skeleton variant="text" width="60%" />
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <List className="song-list">
                    {Array.from(new Array(12)).map((_, index) => (
                      <ListItem key={index}>
                        <ListItemAvatar>
                          <Skeleton variant="rectangular" width={40} height={40} />
                        </ListItemAvatar>
                        <ListItemText
                          primary={<Skeleton width="60%" />}
                          secondary={<Skeleton width="40%" />}
                        />
                      </ListItem>
                    ))}
                  </List>
                )
              ) : (
                viewMode === 'grid' ? (
                  renderSongGrid(displaySongs)
                ) : (
                  renderSongList(displaySongs)
                )
              )}
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
