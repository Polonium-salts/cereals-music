'use client';

import { useState, useEffect } from 'react';
import { 
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Skeleton,
  Box,
  Chip
} from '@mui/material';
import { 
  PlayArrow,
  Favorite,
  Share,
  MoreVert,
  MusicNote,
  AccessTime,
  Person
} from '@mui/icons-material';
import { useParams } from 'next/navigation';
import { getPlaylistDetail, getPlaylistSongs } from '../../services/musicApi';
import { useTheme } from '../../contexts/ThemeContext';
import Sidebar from '../../components/Sidebar';

export default function PlaylistDetailPage() {
  const { id } = useParams();
  const { isDarkMode } = useTheme();
  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPlaylistDetail = async () => {
      setIsLoading(true);
      try {
        const [playlistData, songsData] = await Promise.all([
          getPlaylistDetail(id),
          getPlaylistSongs(id)
        ]);
        setPlaylist(playlistData);
        setSongs(songsData);
      } catch (err) {
        console.error('获取歌单详情失败:', err);
        setError('获取歌单详情失败，请稍后重试');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchPlaylistDetail();
    }
  }, [id]);

  const formatDuration = (duration) => {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <Container>
        <Typography color="error" align="center" sx={{ mt: 4 }}>
          {error}
        </Typography>
      </Container>
    );
  }

  if (!playlist) {
    return null;
  }

  return (
    <div className={`app-container ${isDarkMode ? 'dark-theme' : ''}`}>
      <Sidebar />
      <main className="main-content">
        <div className="content-area">
          <Grid container spacing={4}>
            {/* 歌单信息 */}
            <Grid item xs={12} md={4}>
              <Card className="playlist-detail-card">
                <CardMedia
                  component="img"
                  image={playlist.coverUrl}
                  alt={playlist.name}
                  className="playlist-cover"
                />
                <CardContent>
                  <Typography variant="h5" component="h1" gutterBottom>
                    {playlist.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Person sx={{ mr: 1 }} />
                    <Typography variant="subtitle1">
                      {playlist.creator.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {playlist.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton>
                      <PlayArrow />
                    </IconButton>
                    <IconButton>
                      <Favorite />
                    </IconButton>
                    <IconButton>
                      <Share />
                    </IconButton>
                    <IconButton>
                      <MoreVert />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* 歌曲列表 */}
            <Grid item xs={12} md={8}>
              <Typography variant="h6" gutterBottom>
                歌曲列表 · {songs.length}首歌
              </Typography>
              <List>
                {songs.map((song, index) => (
                  <div key={song.id}>
                    <ListItem
                      className="song-list-item"
                      secondaryAction={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {formatDuration(song.duration)}
                          </Typography>
                          <IconButton edge="end" aria-label="播放">
                            <PlayArrow />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemIcon>
                        <Typography color="text.secondary">
                          {(index + 1).toString().padStart(2, '0')}
                        </Typography>
                      </ListItemIcon>
                      <ListItemText
                        primary={song.name}
                        secondary={song.artists.map(a => a.name).join(', ')}
                      />
                    </ListItem>
                    <Divider />
                  </div>
                ))}
              </List>
            </Grid>
          </Grid>
        </div>
      </main>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <Container>
      <Grid container spacing={4} sx={{ mt: 4 }}>
        <Grid item xs={12} md={4}>
          <Skeleton variant="rectangular" height={300} />
          <Skeleton height={40} sx={{ mt: 2 }} />
          <Skeleton height={24} width="60%" />
          <Skeleton height={80} />
        </Grid>
        <Grid item xs={12} md={8}>
          <Skeleton height={32} width="200px" sx={{ mb: 2 }} />
          {[...Array(5)].map((_, i) => (
            <Box key={i} sx={{ mb: 2 }}>
              <Skeleton height={60} />
              <Divider />
            </Box>
          ))}
        </Grid>
      </Grid>
    </Container>
  );
} 