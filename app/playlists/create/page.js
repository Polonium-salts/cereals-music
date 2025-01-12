'use client';

import { useState } from 'react';
import { 
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Card,
  CardMedia,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  CloudUpload,
  Delete,
  Save,
  ArrowBack
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { createPlaylist } from '../../services/musicApi';
import { useTheme } from '../../contexts/ThemeContext';
import Sidebar from '../../components/Sidebar';

export default function CreatePlaylistPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    coverImage: null,
    coverPreview: null,
    privacy: 'public',
    tags: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('图片大小不能超过5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          coverImage: file,
          coverPreview: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      coverImage: null,
      coverPreview: null
    }));
  };

  const handleTagAdd = (tag) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const handleTagDelete = (tagToDelete) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToDelete)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'tags') {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else if (key !== 'coverPreview') {
          formDataToSend.append(key, formData[key]);
        }
      });

      await createPlaylist(formDataToSend);
      setSuccess(true);
      setTimeout(() => {
        router.push('/playlists');
      }, 1500);
    } catch (err) {
      console.error('创建歌单失败:', err);
      setError('创建歌单失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`app-container ${isDarkMode ? 'dark-theme' : ''}`}>
      <Sidebar />
      <main className="main-content">
        <Container maxWidth="md" className="create-playlist-container">
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => router.back()}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h5" component="h1">
              创建新歌单
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              歌单创建成功！正在跳转...
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Card className="cover-upload-card">
                  {formData.coverPreview ? (
                    <Box className="cover-preview-container">
                      <CardMedia
                        component="img"
                        image={formData.coverPreview}
                        alt="歌单封面预览"
                        className="cover-preview"
                      />
                      <IconButton
                        className="remove-image-btn"
                        onClick={handleRemoveImage}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box className="upload-placeholder">
                      <input
                        type="file"
                        accept="image/*"
                        id="cover-upload"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="cover-upload">
                        <Button
                          component="span"
                          startIcon={<CloudUpload />}
                          variant="outlined"
                        >
                          上传封面
                        </Button>
                      </label>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        支持jpg、png格式，最大5MB
                      </Typography>
                    </Box>
                  )}
                </Card>
              </Grid>

              <Grid item xs={12} md={8}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField
                    required
                    fullWidth
                    label="歌单名称"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    error={formData.name.length > 50}
                    helperText={formData.name.length > 50 ? '名称不能超过50个字符' : ''}
                  />

                  <TextField
                    fullWidth
                    label="歌单描述"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    multiline
                    rows={4}
                    error={formData.description.length > 300}
                    helperText={`${formData.description.length}/300`}
                  />

                  <FormControl fullWidth>
                    <InputLabel>隐私设置</InputLabel>
                    <Select
                      name="privacy"
                      value={formData.privacy}
                      onChange={handleInputChange}
                      label="隐私设置"
                    >
                      <MenuItem value="public">公开</MenuItem>
                      <MenuItem value="private">私密</MenuItem>
                    </Select>
                  </FormControl>

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      标签
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                      {formData.tags.map(tag => (
                        <Chip
                          key={tag}
                          label={tag}
                          onDelete={() => handleTagDelete(tag)}
                        />
                      ))}
                    </Box>
                    <TextField
                      fullWidth
                      placeholder="输入标签按回车添加"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleTagAdd(e.target.value.trim());
                          e.target.value = '';
                        }
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<Save />}
                      disabled={isSubmitting || !formData.name.trim()}
                    >
                      {isSubmitting ? (
                        <>
                          <CircularProgress size={20} sx={{ mr: 1 }} />
                          保存中...
                        </>
                      ) : '创建歌单'}
                    </Button>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Container>
      </main>
    </div>
  );
} 