import axios from 'axios';

// API 基础配置
const API_BASE_URL = 'https://wapi.vip247.icu/';

// 可用的备用API域名列表
const BACKUP_API_URLS = [
  'https://music.qier222.com/api',
  'https://api.music.liuzhijin.cn',
  'https://api.xaneon.com',
  'https://api-music.imsyy.top',
  'https://netease-cloud-music-api-phi-rouge.vercel.app',
  'https://api.injahow.cn/meting',
  'https://netease-cloud-music-api-nine-amber.vercel.app'
];

// 音质级别配置
const QUALITY_LEVELS = [
  { level: 'standard', br: 128000 },
  { level: 'higher', br: 192000 },
  { level: 'exhigh', br: 320000 }
];

// 创建网易云音乐API实例
const neteaseApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive'
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
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache'
    }
  });
  addRetryInterceptor(api);
  return api;
};

addRetryInterceptor(neteaseApi);

// 优化缓存配置
const urlCache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 增加缓存时间到1小时
const PRELOAD_CACHE_DURATION = 30 * 60 * 1000; // 预加载的缓存时间为30分钟
const MAX_CACHE_SIZE = 200; // 限制缓存大小

// 音乐URL预加载队列
const preloadQueue = new Set();
let isPreloading = false;

// 预加载队列处理函数
async function processPreloadQueue() {
  if (isPreloading || preloadQueue.size === 0) return;
  
  isPreloading = true;
  try {
    const id = Array.from(preloadQueue)[0];
    preloadQueue.delete(id);
    
    let url = null;
    try {
      const response = await neteaseApi.get(`/song/url`, {
        params: {
          id,
          br: 320000,
          timestamp: Date.now()
        },
        timeout: 5000
      });

      if (response.data?.code === 200 && response.data.data[0]?.url) {
        url = response.data.data[0].url;
        
        // 验证URL是否可访问
        const checkResponse = await fetch(url, { method: 'HEAD', timeout: 3000 });
        if (!checkResponse.ok) {
          url = null;
        }
      }
    } catch {
      // 忽略预加载错误
    }

    if (url) {
      urlCache.set(id, {
        url,
        expires: Date.now() + PRELOAD_CACHE_DURATION,
        preloaded: true
      });
    }
  } catch {
    // 忽略预加载错误
  } finally {
    isPreloading = false;
    // 检查是否还有需要预加载的歌曲
    if (preloadQueue.size > 0) {
      setTimeout(processPreloadQueue, 100);
    }
  }
}

// 预加载队列管理函数
function queuePreload(currentId, allIds) {
  const currentIndex = allIds.indexOf(currentId);
  if (currentIndex === -1) return;

  // 只预加载下一首歌
  const nextId = allIds[currentIndex + 1];
  if (!nextId) return;

  // 检查是否需要预加载
  const cached = urlCache.get(nextId);
  const now = Date.now();
  if (!cached || cached.expires <= now + (5 * 60 * 1000)) {
    preloadQueue.add(nextId);
    
    // 启动预加载处理
    if (!isPreloading) {
      setTimeout(processPreloadQueue, 100);
    }
  }
}

// 日志级别配置
const LOG_LEVEL = {
  ERROR: 3,
  WARN: 2,
  INFO: 1,
  DEBUG: 0
};

const CURRENT_LOG_LEVEL = LOG_LEVEL.ERROR; // 只显示错误日志

// 日志工具
const logger = {
  debug: () => {},  // 禁用调试日志
  info: () => {},   // 禁用信息日志
  warn: () => {},   // 禁用警告日志
  error: (...args) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVEL.ERROR) {
      console.error('[ERROR]', ...args);
    }
  }
};

// 错误类型
class MusicApiError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = 'MusicApiError';
    this.code = code;
    this.details = details;
  }
}

// 优化的URL验证函数
async function validateUrl(url, retryCount = 2) {
  if (!url) return false;
  
  for (let attempt = 0; attempt < retryCount; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'Range': 'bytes=0-0',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      // 检查响应状态和内容类型
      if (response.ok || response.status === 206) {
        const contentType = response.headers.get('content-type');
        // 只要响应成功就认为URL有效，不再严格检查内容类型
        return true;
      }
    } catch {
      if (attempt === retryCount - 1) {
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return false;
}

// 优化的getMusicUrl函数
export async function getMusicUrl(id, allIds = []) {
  try {
    // 1. 检查缓存
    const cached = urlCache.get(id);
    if (cached && cached.expires > Date.now()) {
      if (cached.url) {
        // 静默预加载下一首
        if (allIds.length > 0) {
          setTimeout(() => queuePreload(id, allIds), 0);
        }
        return cached.url;
      }
      urlCache.delete(id);
    }

    // 2. 尝试获取URL
    let url = null;
    let currentApi = neteaseApi;
    let apiIndex = 0;

    while (!url && apiIndex < BACKUP_API_URLS.length) {
      try {
        // 尝试获取标准音质
        const response = await currentApi.get(`/song/url`, {
          params: {
            id,
            br: 320000,
            timestamp: Date.now()
          },
          timeout: 5000
        });

        if (response.data?.code === 200 && response.data.data[0]?.url) {
          url = response.data.data[0].url;
          // 验证URL是否可用
          if (await validateUrl(url)) {
            // 如果不是主API，更新主API
            if (currentApi !== neteaseApi && BACKUP_API_URLS[apiIndex] !== API_BASE_URL) {
              console.log('更新主API源:', BACKUP_API_URLS[apiIndex]);
              neteaseApi.defaults.baseURL = BACKUP_API_URLS[apiIndex];
            }
            break;
          }
        }

        // 如果URL获取失败或验证失败，尝试下一个API源
        url = null;
        currentApi = createBackupApi(BACKUP_API_URLS[apiIndex]);
        apiIndex++;
      } catch (error) {
        // 如果当前API源失败，尝试下一个
        url = null;
        currentApi = createBackupApi(BACKUP_API_URLS[apiIndex]);
        apiIndex++;
      }
    }

    // 如果获取到有效URL，缓存并返回
    if (url) {
      urlCache.set(id, {
        url,
        expires: Date.now() + CACHE_DURATION,
        preloaded: false
      });
      
      // 静默预加载下一首
      if (allIds.length > 0) {
        setTimeout(() => queuePreload(id, allIds), 0);
      }
      return url;
    }

    throw new MusicApiError('无法获取音乐播放地址', 'URL_NOT_FOUND');
  } catch (error) {
    if (error instanceof MusicApiError) {
      throw error;
    }
    throw new MusicApiError('获取音乐URL失败', 'UNKNOWN_ERROR');
  }
}

// 优化的批量获取函数
async function batchGetMusicUrls(ids, retryCount = 1) {
  try {
    const results = new Map();
    const promises = ids.map(async (id) => {
      try {
        const url = await getDirectMusicUrl(id);
        if (url) {
          results.set(id, url);
        }
      } catch {
        // 忽略单个失败
      }
    });

    await Promise.all(promises);
    return results;
  } catch {
    return new Map();
  }
}

// 批量预加载
export async function preloadMusicUrls(ids) {
  const preloadPromises = ids.slice(0, 5).map(id => preloadMusicUrl(id));
  await Promise.all(preloadPromises);
}

// 修改搜索函数，减少预加载数量
export const searchMusic = async (keywords) => {
  try {
    const songs = await searchMusicBase(keywords);
    // 只预加载前5首歌曲
    const preloadIds = songs.slice(0, 5).map(song => song.id);
    // 一首一首加载，避免并发请求
    for (const id of preloadIds) {
      preloadQueue.add(id);
    }
    if (!isPreloading) {
      setTimeout(processPreloadQueue, 100);
    }
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

// 修改获取热门歌曲函数，减少预加载数量
export const getHotSongs = async (limit = 30) => {
  try {
    const songs = await getNeteaseSongs(limit);
    // 只预加载前5首歌曲
    const preloadIds = songs.slice(0, 5).map(song => song.id);
    // 一首一首加载，避免并发请求
    for (const id of preloadIds) {
      preloadQueue.add(id);
    }
    if (!isPreloading) {
      setTimeout(processPreloadQueue, 100);
    }
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