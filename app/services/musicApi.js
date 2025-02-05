import axios from 'axios';

// 创建一个带有超时和重试配置的 axios 实例
const api = axios.create({
  baseURL: 'https://wapi.vip247.icu/',
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

// URL配置
const URL_CONFIG = {
  MAX_RETRY: 2,
  RETRY_DELAY: 1000,
  TIMEOUT: 8000,
  CACHE_DURATION: 5 * 60 * 1000, // 5分钟缓存
  QUALITY_LEVELS: ['standard', 'higher', 'exhigh']
};

// URL缓存
const urlCache = new Map();

// 尝试获取音乐URL
const tryGetMusicUrl = async (id, quality) => {
  try {
    const response = await api.get('/song/url/v1', {
      params: {
        id,
        level: quality,
        realIP: '116.25.146.177'
      },
      timeout: URL_CONFIG.TIMEOUT
    });

    const url = response.data?.data?.[0]?.url;
    if (!url) {
      throw new Error('URL不可用');
    }

    // 验证URL是否可访问
    const testResponse = await fetch(url, { method: 'HEAD' });
    if (!testResponse.ok) {
      throw new Error('URL无法访问');
    }

    return url;
  } catch (error) {
    console.error(`获取音乐URL失败 (quality: ${quality}):`, error);
    throw error;
  }
};

export const getMusicUrl = async (id) => {
  if (!id) {
    throw new Error('缺少音乐ID');
  }

  // 检查缓存
  const now = Date.now();
  const cached = urlCache.get(id);
  if (cached && now - cached.timestamp < URL_CONFIG.CACHE_DURATION) {
    return cached.url;
  }

  let lastError;
  // 尝试不同音质级别
  for (const quality of URL_CONFIG.QUALITY_LEVELS) {
    for (let retry = 0; retry <= URL_CONFIG.MAX_RETRY; retry++) {
      try {
        const url = await tryGetMusicUrl(id, quality);
        
        // 缓存URL
        urlCache.set(id, {
          url,
          timestamp: now
        });
        
        return url;
      } catch (error) {
        lastError = error;
        if (retry < URL_CONFIG.MAX_RETRY) {
          await new Promise(resolve => setTimeout(resolve, URL_CONFIG.RETRY_DELAY));
        }
      }
    }
  }

  // 所有尝试都失败
  console.error('获取音乐URL最终失败:', lastError);
  throw new Error('无法获取音乐播放地址');
};

export const searchMusic = async (keywords) => {
  try {
    // 首先搜索歌曲
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

    // 获取所有歌曲ID
    const songIds = response.data.result.songs.map(song => song.id).join(',');

    // 获取歌曲详情以获取高质量封面
    const detailResponse = await api.get('/song/detail', {
      params: { ids: songIds }
    });

    const songDetails = detailResponse.data?.songs || [];
    const songDetailsMap = new Map(songDetails.map(song => [song.id, song]));

    return response.data.result.songs.map(song => {
      const detail = songDetailsMap.get(song.id);
      return {
        id: song.id,
        name: song.name,
        artists: song.artists.map(artist => ({
          id: artist.id,
          name: artist.name
        })),
        album: {
          id: song.album.id,
          name: song.album.name,
          picUrl: detail?.al?.picUrl || song.album.picUrl || null
        },
        duration: song.duration,
        platform: 'netease'
      };
    });
  } catch (error) {
    console.error('网易云音乐搜索失败:', error);
    throw new Error('网易云音乐搜索失败');
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

export const getHotSongs = async (limit = 30) => {
  try {
    const response = await api.get('/personalized/newsong', {
      params: { limit }
    });

    if (!response.data?.result) {
      return [];
    }

    return response.data.result.map(item => ({
      id: item.id,
      name: item.name,
      artists: item.song.artists.map(artist => ({
        id: artist.id,
        name: artist.name
      })),
      album: {
        id: item.song.album.id,
        name: item.song.album.name,
        picUrl: item.song.album.picUrl
      },
      duration: item.song.duration,
      platform: 'netease'
    }));
  } catch (error) {
    console.error('获取热门歌曲失败:', error);
    throw new Error('获取热门歌曲失败');
  }
}; 