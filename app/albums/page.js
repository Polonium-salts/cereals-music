'use client';

import { useState } from 'react';
import { 
  TextField, 
  Button, 
  Card, 
  Typography, 
  IconButton, 
  CircularProgress,
  Alert,
  Grid,
  Tooltip,
  Box,
  useTheme
} from '@mui/material';
import { PlayArrow, CloudUpload, GitHub } from '@mui/icons-material';
import { importMusicFromGit } from '../services/musicApi';

export default function Albums() {
  const [gitUrl, setGitUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [albums, setAlbums] = useState([]);
  const theme = useTheme();

  const handleImport = async () => {
    if (!gitUrl) {
      setError('请输入Git仓库地址');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const result = await importMusicFromGit(gitUrl);
      
      setAlbums(result.albums);
      setSuccess('音乐库导入成功！');
      setGitUrl('');
    } catch (error) {
      setError(error.message || '导入失败，请检查Git地址是否正确');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-area">
      {/* 页面标题区域 */}
      <Box className="albums-header">
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ 
            fontWeight: 700,
            background: 'linear-gradient(45deg, #fff 30%, #e0e0e0 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          新碟上架
        </Typography>
        <Typography 
          variant="h6" 
          sx={{ color: 'rgba(255,255,255,0.8)' }}
        >
          发现和导入最新音乐专辑，支持Git仓库批量导入
        </Typography>

        {/* 导入表单 */}
        <Card className="import-form-card">
          <Box sx={{ p: 2 }}>
            <div className="import-form">
              <TextField
                fullWidth
                placeholder="例如: https://github.com/username/music-repo"
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
                disabled={loading}
                InputProps={{
                  startAdornment: <GitHub sx={{ mr: 1, color: 'rgba(255,255,255,0.8)' }} />,
                }}
              />
              <Button
                variant="contained"
                onClick={handleImport}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <CloudUpload />}
              >
                {loading ? '导入中...' : '导入音乐库'}
              </Button>
            </div>

            {error && (
              <Alert 
                severity="error" 
                sx={{ mt: 2 }}
              >
                {error}
              </Alert>
            )}

            {success && (
              <Alert 
                severity="success" 
                sx={{ mt: 2 }}
              >
                {success}
              </Alert>
            )}
          </Box>
        </Card>
      </Box>

      {/* 专辑列表 */}
      {albums.length > 0 && (
        <div className="albums-grid">
          {albums.map((album, index) => (
            <Card 
              className="album-card"
              key={album.id}
              style={{ '--i': index }}
            >
              <div className="album-cover-container">
                <img
                  src={album.coverUrl || '/default-album.png'}
                  alt={album.name}
                  className="album-cover"
                />
                <div className="album-overlay">
                  <IconButton className="play-button">
                    <PlayArrow />
                  </IconButton>
                </div>
              </div>
              <div className="album-info">
                <Typography className="album-name">
                  {album.name}
                </Typography>
                <Typography className="album-artist">
                  {album.artist}
                </Typography>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 