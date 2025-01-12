import axios from 'axios';

// 创建网易云音乐API实例
const neteaseApi = axios.create({
  baseURL: 'https://wapi.vip247.icu/',
  timeout: 15000,
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
export const getMusicUrl = async (id, platform = 'netease') => {
  try {
    const response = await neteaseApi.get('/song/url', {
      params: { 
        id,
        realIP: '116.25.146.177'
      }
    });
    const url = response.data?.data?.[0]?.url;
    if (!url) throw new Error('无法获取音乐URL');
    return url;
  } catch (error) {
    console.error('获取音乐URL失败:', error);
    throw error;
  }
};

// 获取歌单列表
export async function getPlaylists(limit = 30, cat = '全部') {
  try {
    const results = await getNeteasePlaylists(limit, cat);
    return results;
  } catch (error) {
    console.error('获取歌单列表失败:', error);
    throw new Error('获取歌单列表失败');
  }
}

// 网易云歌单
async function getNeteasePlaylists(limit, cat) {
  try {
    const response = await neteaseApi.get('/top/playlist', {
      params: { limit, cat, offset: 0, order: 'hot' }
    });

    if (!response.data?.playlists) return [];

    return response.data.playlists.map(playlist => ({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      coverUrl: playlist.coverImgUrl,
      songCount: playlist.trackCount,
      playCount: playlist.playCount,
      creator: {
        id: playlist.creator.userId,
        name: playlist.creator.nickname,
        avatarUrl: playlist.creator.avatarUrl
      },
      tags: playlist.tags
    }));
  } catch (error) {
    console.error('获取网易云歌单失败:', error);
    return [];
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

// 获取歌单分类
export async function getPlaylistCategories() {
  try {
    const response = await neteaseApi.get('/playlist/catlist');
    if (response.data.categories) {
      const categories = [];
      Object.keys(response.data.categories).forEach(key => {
        const category = response.data.categories[key];
        const subs = response.data.sub.filter(item => item.category === parseInt(key));
        categories.push({
          name: category,
          subs: subs.map(sub => ({
            name: sub.name,
            hot: sub.hot
          }))
        });
      });
      return categories;
    }
    return [];
  } catch (error) {
    console.error('获取歌单分类失败:', error);
    throw new Error('获取歌单分类失败');
  }
}

// 获取歌单详情
export async function getPlaylistDetail(id) {
  try {
    const response = await neteaseApi.get(`/playlist/detail`, {
      params: { id }
    });

    if (response.data.playlist) {
      const playlist = response.data.playlist;
      return {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        coverUrl: playlist.coverImgUrl,
        songCount: playlist.trackCount,
        playCount: playlist.playCount,
        creator: {
          id: playlist.creator.userId,
          name: playlist.creator.nickname,
          avatarUrl: playlist.creator.avatarUrl
        },
        tags: playlist.tags,
        tracks: playlist.tracks?.map(track => ({
          id: track.id,
          name: track.name,
          artists: track.ar?.map(artist => ({
            id: artist.id,
            name: artist.name
          })),
          album: {
            id: track.al?.id,
            name: track.al?.name,
            picUrl: track.al?.picUrl
          },
          duration: track.dt
        }))
      };
    }
    return null;
  } catch (error) {
    console.error('获取歌单详情失败:', error);
    throw new Error('获取歌单详情失败');
  }
} 