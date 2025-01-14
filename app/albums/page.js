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
      <Box 
        sx={{ 
          background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 100%)',
          p: 6,
          mb: 4,
          borderRadius: 2,
          color: 'white',
          textAlign: 'center'
        }}
      >
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ 
            fontWeight: 700,
            mb: 2,
            background: 'linear-gradient(45deg, #fff 30%, #e0e0e0 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          新碟上架
        </Typography>
        <Typography 
          variant="h6" 
          sx={{ 
            color: 'rgba(255,255,255,0.8)',
            maxWidth: 600,
            mx: 'auto',
            mb: 4
          }}
        >
          发现和导入最新音乐专辑，支持Git仓库批量导入
        </Typography>

        {/* 导入表单 */}
        <Card 
          sx={{ 
            maxWidth: 800,
            mx: 'auto',
            p: 3,
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}
        >
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              placeholder="例如: https://github.com/username/music-repo"
              value={gitUrl}
              onChange={(e) => setGitUrl(e.target.value)}
              disabled={loading}
              InputProps={{
                startAdornment: <GitHub sx={{ mr: 1, color: 'rgba(255,255,255,0.8)' }} />,
                sx: {
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'white',
                  },
                  backgroundColor: 'rgba(255,255,255,0.1)',
                }
              }}
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <CloudUpload />}
              sx={{ 
                height: 56,
                minWidth: 160,
                fontSize: '1rem',
                textTransform: 'none',
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1976D2 30%, #00BCD4 90%)',
                }
              }}
            >
              {loading ? '导入中...' : '导入音乐库'}
            </Button>
          </Box>

          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mt: 2,
                backgroundColor: 'rgba(211, 47, 47, 0.1)',
                color: '#ff1744'
              }}
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert 
              severity="success" 
              sx={{ 
                mt: 2,
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                color: '#69f0ae'
              }}
            >
              {success}
            </Alert>
          )}
        </Card>
      </Box>

      {/* 专辑列表 */}
      {albums.length > 0 && (
        <Box sx={{ px: 4 }}>
          <Grid container spacing={3}>
            {albums.map((album) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={album.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 24px rgba(0,0,0,0.2)',
                      '& .album-overlay': {
                        opacity: 1
                      }
                    }
                  }}
                >
                  <Box sx={{ position: 'relative', paddingTop: '100%' }}>
                    <img
                      src={album.coverUrl || '/default-album.png'}
                      alt={album.name}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <Box 
                      className="album-overlay"
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.3s ease'
                      }}
                    >
                      <IconButton 
                        sx={{
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': {
                            bgcolor: 'primary.dark',
                            transform: 'scale(1.1)'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <PlayArrow />
                      </IconButton>
                    </Box>
                  </Box>
                  <Box sx={{ p: 2 }}>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        fontWeight: 600,
                        mb: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      {album.name}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="textSecondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {album.artist}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </div>
  );
} 