import axios from 'axios';

// API 基础配置
const API_BASE_URL = 'https://wapi.vip247.icu';

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

addRetryInterceptor(neteaseApi);

// 搜索音乐
export const searchMusic = async (keywords) => {
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
};

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

// 获取音乐URL
export async function getMusicUrl(id) {
  try {
    const response = await neteaseApi.get(`/song/url/v1`, {
      params: {
        id,
        level: 'standard',
        timestamp: Date.now()
      }
    });
    
    if (response.data.code !== 200) {
      throw new Error(response.data.msg || '获取音乐URL失败');
    }
    return response.data.data[0]?.url;
  } catch (error) {
    console.error('获取音乐URL失败:', error);
    throw error;
  }
}

// 获取热门歌曲
export const getHotSongs = async (limit = 30) => {
  try {
    const results = await getNeteaseSongs(limit);
    return results;
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