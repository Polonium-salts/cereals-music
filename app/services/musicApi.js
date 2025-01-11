import axios from 'axios';

// 创建一个带有超时和重试配置的 axios 实例
const api = axios.create({
  baseURL: 'https://api-flax-phi-41.vercel.app',
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

export const searchMusic = async (keywords) => {
  try {
    const response = await api.get('/search', {
      params: {
        keywords,
        limit: 100,
        type: 1 // 1: 单曲, 10: 专辑, 100: 歌手, 1000: 歌单
      }
    });

    if (!response.data?.result?.songs) {
      return [];
    }

    return response.data.result.songs.map(song => ({
      id: song.id,
      name: song.name,
      artists: song.artists.map(artist => ({
        id: artist.id,
        name: artist.name
      })),
      album: {
        id: song.album.id,
        name: song.album.name,
        picUrl: song.album.picUrl
      },
      duration: song.duration,
      platform: 'netease'
    }));
  } catch (error) {
    console.error('网易云音乐搜索失败:', error);
    throw new Error('网易云音乐搜索失败');
  }
};

export const getMusicUrl = async (id) => {
  try {
    const response = await api.get('/song/url', {
      params: { 
        id,
        realIP: '116.25.146.177' // 添加 realIP 参数
      }
    });

    const url = response.data?.data?.[0]?.url;
    if (!url) {
      throw new Error('无法获取音乐URL');
    }

    return url;
  } catch (error) {
    console.error('获取音乐URL失败:', error);
    throw error;
  }
};

export const getMusicDetail = async (id) => {
  try {
    const response = await api.get('/song/detail', {
      params: { ids: id }
    });

    const song = response.data?.songs?.[0];
    if (!song) {
      throw new Error('无法获取音乐详情');
    }

    return {
      id: song.id,
      name: song.name,
      artists: song.ar.map(artist => ({
        id: artist.id,
        name: artist.name
      })),
      album: {
        id: song.al.id,
        name: song.al.name,
        picUrl: song.al.picUrl
      },
      duration: song.dt,
      platform: 'netease'
    };
  } catch (error) {
    console.error('获取音乐详情失败:', error);
    throw error;
  }
}; 