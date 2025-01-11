import axios from 'axios';

const api = axios.create({
  baseURL: 'https://youtube-api-ten-tawny.vercel.app',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 添加响应拦截器
api.interceptors.response.use(
  response => response,
  async error => {
    const { config, response } = error;
    
    // 如果是网络错误或超时，尝试重试
    if (!response && config && !config._retry) {
      config._retry = true;
      return new Promise(resolve => setTimeout(() => resolve(api(config)), 1000));
    }
    return Promise.reject(error);
  }
);

export const searchKugouMusic = async (keywords) => {
  try {
    console.log('开始搜索YouTube Music:', keywords);
    const response = await api.get('/search/youtube', {
      params: {
        keywords,
        limit: 100
      }
    });

    console.log('YouTube Music API响应:', response.data);

    if (!response.data?.result?.songs) {
      console.log('未找到YouTube Music搜索结果');
      return [];
    }

    const songs = response.data.result.songs.map(song => ({
      id: song.videoId || song.id,
      name: song.title || song.name,
      artists: song.artists ? song.artists.map(artist => ({
        name: artist.name || artist
      })) : [{ name: song.artist || 'Unknown Artist' }],
      album: {
        id: song.albumId || '',
        name: song.album || '未知专辑',
        picUrl: song.thumbnail || song.imageUrl
      },
      duration: song.duration || 0,
      platform: 'youtube',
      videoId: song.videoId || song.id
    }));

    console.log('处理后的YouTube Music结果:', songs);
    return songs;
  } catch (error) {
    console.error('YouTube Music搜索失败:', error);
    return []; // 返回空数组而不是抛出错误，这样不会影响网易云的结果
  }
};

export const getKugouMusicUrl = async (id) => {
  try {
    console.log('获取YouTube Music URL:', id);
    const response = await api.get('/song/url/youtube', {
      params: { id }
    });

    console.log('YouTube Music URL响应:', response.data);

    if (!response.data?.url) {
      throw new Error('无法获取YouTube Music URL');
    }

    return response.data.url;
  } catch (error) {
    console.error('获取YouTube Music URL失败:', error);
    throw error;
  }
};

export const getKugouMusicDetail = async (id) => {
  try {
    console.log('获取YouTube Music详情:', id);
    const response = await api.get('/song/detail/youtube', {
      params: { id }
    });

    console.log('YouTube Music详情响应:', response.data);

    if (!response.data) {
      throw new Error('无法获取YouTube Music详情');
    }

    const song = response.data;
    return {
      id: song.videoId || song.id,
      name: song.title || song.name,
      artists: song.artists ? song.artists.map(artist => ({
        name: artist.name || artist
      })) : [{ name: song.artist || 'Unknown Artist' }],
      album: {
        id: song.albumId || '',
        name: song.album || '未知专辑',
        picUrl: song.thumbnail || song.imageUrl
      },
      duration: song.duration || 0,
      platform: 'youtube',
      videoId: song.videoId || song.id,
      url: song.url
    };
  } catch (error) {
    console.error('获取YouTube Music详情失败:', error);
    throw error;
  }
}; 