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
  Tooltip
} from '@mui/material';
import { PlayArrow, Add, GitHub } from '@mui/icons-material';
import { importMusicFromGit } from '../services/musicApi';

export default function NewAlbums() {
  const [gitUrl, setGitUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [albums, setAlbums] = useState([]);

  const handleImport = async () => {
    if (!gitUrl) {
      setError('请输入Git仓库地址');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // 调用导入API
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
    <div className="new-albums-container">
      <div className="import-section">
        <Typography variant="h4" component="h1" className="page-title">
          新碟上架
        </Typography>
        <Typography variant="body1" className="page-description" color="textSecondary">
          通过Git仓库导入新的音乐库，支持批量导入音乐文件
        </Typography>

        <Card className="import-card">
          <div className="import-form">
            <TextField
              fullWidth
              label="Git仓库地址"
              variant="outlined"
              value={gitUrl}
              onChange={(e) => setGitUrl(e.target.value)}
              placeholder="例如: https://github.com/username/music-repo"
              disabled={loading}
              InputProps={{
                startAdornment: <GitHub className="git-icon" />,
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleImport}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Add />}
              className="import-button"
            >
              {loading ? '导入中...' : '导入音乐库'}
            </Button>
          </div>

          {error && (
            <Alert severity="error" className="alert">
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" className="alert">
              {success}
            </Alert>
          )}
        </Card>
      </div>

      {albums.length > 0 && (
        <div className="albums-section">
          <Typography variant="h5" component="h2" className="section-title">
            最近导入
          </Typography>
          <Grid container spacing={3}>
            {albums.map((album) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={album.id}>
                <Card className="album-card">
                  <div className="album-cover-container">
                    <img
                      src={album.coverUrl || '/default-album.png'}
                      alt={album.name}
                      className="album-cover"
                    />
                    <div className="album-overlay">
                      <Tooltip title="播放">
                        <IconButton className="play-button">
                          <PlayArrow />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="album-info">
                    <Typography variant="subtitle1" className="album-name">
                      {album.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" className="album-artist">
                      {album.artist}
                    </Typography>
                  </div>
                </Card>
              </Grid>
            ))}
          </Grid>
        </div>
      )}
    </div>
  );
} 