import axios from 'axios';

// API 基础配置
const API_BASE_URL = 'https://wapi.vip247.icu';

// 备用API域名列表
const BACKUP_API_URLS = [
  'https://wapi.vip247.icu',
  'https://netease.vercel.app',
  'https://netease-cloud-music-api-beta.vercel.app',
  'https://music.qier222.com/api',
  'https://api.xaneon.com',
  'https://netease-cloud-music-api.vercel.app',
  'https://api-music.imsyy.top',
  'https://api.wuenci.com/meting/api',
  'https://api.injahow.cn/meting',
  'https://netease-cloud-music-api-gamma.vercel.app'
];

// 音质级别配置
const QUALITY_LEVELS = [
  { level: 'standard', br: 128000 },
  { level: 'higher', br: 192000 },
  { level: 'exhigh', br: 320000 },
  { level: 'lossless', br: 999000 },
  { level: 'hires', br: 1999000 }
];

// 创建网易云音乐API实例
const neteaseApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 添加响应拦截器
const addRetryInterceptor = (api) => {
  api.interceptors.response.use(
    response => response,
    async error => {
      const { config, response } = error;
      if ((!response && config && !config._retry) || 
          (error.code === 'ERR_CERT_COMMON_NAME_INVALID' || 
           error.code === 'ERR_CERT_AUTHORITY_INVALID')) {
        config._retry = true;
        return new Promise(resolve => setTimeout(() => resolve(api(config)), 1000));
      }
      return Promise.reject(error);
    }
  );
};

// 创建备用API实例
const createBackupApi = (baseURL) => {
  const api = axios.create({
    baseURL,
    timeout: 5000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    }
  });
  addRetryInterceptor(api);
  return api;
};

addRetryInterceptor(neteaseApi);

// URL缓存
const urlCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30分钟缓存
const preloadCache = new Map(); // 预加载缓存
const BATCH_SIZE = 20; // 批量获取的数量

// 批量获取音乐URL
async function batchGetMusicUrls(ids) {
  try {
    const uncachedIds = ids.filter(id => !urlCache.has(id) || urlCache.get(id).expires <= Date.now());
    if (uncachedIds.length === 0) return new Map();

    // 批量获取URL
    const response = await neteaseApi.get(`/song/url/v1`, {
      params: {
        id: uncachedIds.join(','),
        level: 'standard',
        timestamp: Date.now()
      },
      timeout: 5000
    });

    const urlMap = new Map();
    if (response.data?.code === 200 && response.data.data) {
      for (const item of response.data.data) {
        if (item.url) {
          urlMap.set(item.id, item.url);
          // 更新缓存
          urlCache.set(item.id, {
            url: item.url,
            expires: Date.now() + CACHE_DURATION
          });
        }
      }
    }

    // 对于获取失败的ID，尝试单独获取
    const failedIds = uncachedIds.filter(id => !urlMap.has(id));
    if (failedIds.length > 0) {
      await Promise.all(failedIds.map(async id => {
        try {
          const url = await getMusicUrl(id);
          if (url) {
            urlMap.set(id, url);
          }
        } catch (error) {
          console.warn(`单独获取音乐URL失败: ${id}`, error);
        }
      }));
    }

    return urlMap;
  } catch (error) {
    console.error('批量获取音乐URL失败:', error);
    return new Map();
  }
}

// 预加载音乐URL（批量）
async function preloadMusicUrls(ids) {
  try {
    const batchIds = ids.slice(0, BATCH_SIZE);
    const urlMap = await batchGetMusicUrls(batchIds);
    
    // 预缓存URL
    for (const [id, url] of urlMap.entries()) {
      if (!urlCache.has(id)) {
        urlCache.set(id, {
          url,
          expires: Date.now() + CACHE_DURATION
        });
      }
    }
  } catch (error) {
    console.warn('预加载失败:', error);
  }
}

// 获取音乐URL（优化版）
export async function getMusicUrl(id) {
  try {
    // 检查缓存
    const cached = urlCache.get(id);
    if (cached && cached.expires > Date.now()) {
      return cached.url;
    }

    // 尝试批量获取
    const urlMap = await batchGetMusicUrls([id]);
    const url = urlMap.get(id);
    if (url) {
      return url;
    }

    // 如果批量获取失败，回退到单独获取
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await neteaseApi.get(`/song/url/v1`, {
          params: {
            id,
            level: 'standard',
            timestamp: Date.now()
          },
          timeout: 3000
        });

        if (response.data?.code === 200 && response.data.data[0]?.url) {
          const url = response.data.data[0].url;
          urlCache.set(id, {
            url,
            expires: Date.now() + CACHE_DURATION
          });
          return url;
        }
      } catch (error) {
        console.warn(`获取音乐URL失败(第${attempts}次):`, error);
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    throw new Error('无法获取音乐播放地址');
  } catch (error) {
    console.error('获取音乐URL失败:', error);
    throw error;
  }
}

// 优化的URL验证函数
async function validateUrl(url) {
  if (!url) return false;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 减少验证超时时间
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'Range': 'bytes=0-0',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      }
    });
    
    clearTimeout(timeoutId);
    
    // 简化状态码检查，接受更多类型的响应
    if (response.status >= 200 && response.status < 400) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn('URL验证出错:', error);
    return false;
  }
}

// 修改搜索函数，添加批量预加载
export const searchMusic = async (keywords) => {
  try {
    const songs = await searchMusicBase(keywords);
    // 预加载搜索结果的URL
    preloadMusicUrls(songs.map(song => song.id));
    return songs;
  } catch (error) {
    console.error('搜索音乐失败:', error);
    throw new Error('搜索音乐失败');
  }
};

// 基础搜索函数
async function searchMusicBase(keywords) {
  try {
    // 先获取搜索结果总数
    const countResponse = await neteaseApi.get('/search', {
      params: {
        keywords,
        limit: 1,
        type: 1
      }
    });

    const totalCount = countResponse.data?.result?.songCount || 0;
    console.log('搜索结果总数:', totalCount);

    // 计算需要请求的次数
    const pageSize = 100;
    const pages = Math.ceil(totalCount / pageSize);
    const maxPages = 10; // 限制最大页数，防止请求过多
    const actualPages = Math.min(pages, maxPages);

    // 分批并行请求数据，每批5页
    const batchSize = 5;
    const allSongs = [];
    const batchPromises = [];
    
    // 准备所有搜索请求
    for (let page = 1; page <= actualPages; page++) {
      batchPromises.push(searchNetease(keywords, page, pageSize));
      
      // 每到一个批次就执行
      if (batchPromises.length === batchSize || page === actualPages) {
        const batchResults = await Promise.all(batchPromises);
        allSongs.push(...batchResults.flat());
        batchPromises.length = 0; // 清空数组
      }
    }

    console.log('实际获取的歌曲数量:', allSongs.length);

    // 使用Map进行去重和快速查找
    const uniqueSongsMap = new Map();
    allSongs.forEach(song => {
      if (!uniqueSongsMap.has(song.id)) {
        uniqueSongsMap.set(song.id, song);
      }
    });

    // 转换回数组并排序
    return Array.from(uniqueSongsMap.values()).sort((a, b) => {
      const nameCompare = a.name.localeCompare(b.name);
      if (nameCompare !== 0) return nameCompare;
      return a.artists[0]?.name.localeCompare(b.artists[0]?.name);
    });
  } catch (error) {
    console.error('搜索音乐失败:', error);
    throw new Error('搜索音乐失败');
  }
}

// 网易云音乐搜索
async function searchNetease(keywords, page = 1, pageSize = 100) {
  try {
    const offset = (page - 1) * pageSize;
    const response = await neteaseApi.get('/search', {
      params: {
        keywords,
        limit: pageSize,
        type: 1,
        offset: offset
      }
    });

    if (!response.data?.result?.songs) {
      return [];
    }

    const songs = response.data.result.songs;
    
    // 只获取没有专辑图片的歌曲的详情
    const songsNeedingDetails = songs.filter(song => !song.album.picUrl);
    let songDetails = [];
    
    if (songsNeedingDetails.length > 0) {
      try {
        const songIds = songsNeedingDetails.map(song => song.id).join(',');
        const detailResponse = await neteaseApi.get('/song/detail', {
          params: { ids: songIds }
        });
        songDetails = detailResponse.data?.songs || [];
      } catch (error) {
        console.error('获取歌曲详情失败:', error);
      }
    }

    const songDetailsMap = new Map(songDetails.map(song => [song.id, song]));

    return songs.map(song => {
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
          picUrl: song.album.picUrl || detail?.al?.picUrl || null
        },
        duration: song.duration
      };
    }).filter(song => song.name && song.artists.length > 0);
  } catch (error) {
    console.error('网易云音乐搜索失败:', error);
    return [];
  }
}

// 修改获取热门歌曲函数，添加批量预加载
export const getHotSongs = async (limit = 30) => {
  try {
    const songs = await getNeteaseSongs(limit);
    // 预加载热门歌曲的URL
    preloadMusicUrls(songs.map(song => song.id));
    return songs;
  } catch (error) {
    console.error('获取热门歌曲失败:', error);
    throw new Error('获取热门歌曲失败');
  }
};

// 获取网易云热门歌曲
async function getNeteaseSongs(limit) {
  try {
    const response = await neteaseApi.get('/personalized/newsong', {
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
      duration: item.song.duration
    }));
  } catch (error) {
    console.error('获取网易云热门歌曲失败:', error);
    return [];
  }
} 