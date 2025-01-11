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

// 创建酷狗音乐的 axios 实例
const kugouApi = axios.create({
  baseURL: 'https://kapi.vip247.icu',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 添加响应拦截器
kugouApi.interceptors.response.use(
  response => response,
  async error => {
    const { config, response } = error;
    
    // 如果是网络错误或超时，尝试重试
    if ((!response || response.status === 502) && config && !config._retry) {
      config._retry = true;
      // 增加重试延迟
      return new Promise(resolve => setTimeout(() => resolve(kugouApi(config)), 2000));
    }
    return Promise.reject(error);
  }
);

// 搜索酷狗音乐
async function searchKugou(keywords) {
  try {
    const response = await kugouApi.get('/search', {
      params: {
        keywords,
        limit: 100
      }
    });

    if (!response.data?.data?.lists) {
      return [];
    }

    return response.data.data.lists.map(song => ({
      id: song.FileHash,
      name: song.SongName,
      artists: [{
        id: song.SingerId || 0,
        name: song.SingerName
      }],
      album: {
        id: song.AlbumID || 0,
        name: song.AlbumName || '未知专辑',
        picUrl: song.Image || null
      },
      duration: (song.Duration || 0) * 1000, // 转换为毫秒
      platform: 'kugou',
      extra: {
        hash: song.FileHash,
        albumAudioId: song.AlbumAudioId
      }
    }));
  } catch (error) {
    console.error('酷狗音乐搜索失败:', error);
    return []; // 返回空数组而不是抛出错误，这样可以继续处理其他平台的结果
  }
}

// 获取酷狗音乐URL
export const getKugouMusicUrl = async (hash, albumAudioId) => {
  try {
    const response = await kugouApi.get('/song/url', {
      params: { 
        hash,
        albumAudioId
      }
    });

    if (!response.data?.data?.url) {
      throw new Error('无法获取酷狗音乐URL');
    }

    return response.data.data.url;
  } catch (error) {
    console.error('获取酷狗音乐URL失败:', error);
    throw error;
  }
};

// 修改搜索函数以支持多平台
export const searchMusic = async (keywords) => {
  try {
    // 并行搜索两个平台
    const [neteaseResults, kugouResults] = await Promise.all([
      searchNetease(keywords),
      searchKugou(keywords)
    ]);

    // 合并并去重结果
    const allResults = [...neteaseResults, ...kugouResults];
    
    // 按照歌曲名称和艺术家进行排序
    return allResults.sort((a, b) => {
      const aName = `${a.name} ${a.artists.map(artist => artist.name).join(' ')}`;
      const bName = `${b.name} ${b.artists.map(artist => artist.name).join(' ')}`;
      return aName.localeCompare(bName);
    });
  } catch (error) {
    console.error('搜索音乐失败:', error);
    throw new Error('搜索音乐失败');
  }
};

// 将原来的搜索函数重命名为 searchNetease
async function searchNetease(keywords) {
  try {
    const response = await api.get('/search', {
      params: {
        keywords,
        limit: 100,
        type: 1
      }
    });

    if (!response.data?.result?.songs) {
      return [];
    }

    const songIds = response.data.result.songs.map(song => song.id).join(',');
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
    return []; // 返回空数组而不是抛出错误
  }
}

// 修改获取音乐URL的函数以支持多平台
export const getMusicUrl = async (song) => {
  try {
    if (song.platform === 'kugou') {
      return await getKugouMusicUrl(song.extra.hash, song.extra.albumAudioId);
    } else {
      return await getNeteaseUrl(song.id);
    }
  } catch (error) {
    console.error('获取音乐URL失败:', error);
    throw error;
  }
};

// 将原来的 getMusicUrl 重命名为 getNeteaseUrl
async function getNeteaseUrl(id) {
  try {
    const response = await api.get('/song/url', {
      params: { 
        id,
        realIP: '116.25.146.177'
      }
    });

    const url = response.data?.data?.[0]?.url;
    if (!url) {
      throw new Error('无法获取音乐URL');
    }

    return url;
  } catch (error) {
    console.error('获取网易云音乐URL失败:', error);
    throw error;
  }
}

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

// 获取歌单分类
export async function getPlaylistCategories() {
  try {
    const response = await api.get('/playlist/catlist');
    if (response.data.categories && response.data.sub) {
      const categories = Object.entries(response.data.categories).map(([id, name]) => ({
        id,
        name
      }));
      
      const subCategories = response.data.sub.map(item => ({
        id: item.name,
        name: item.name,
        category: item.category,
        hot: item.hot
      }));

      return {
        categories,
        subCategories
      };
    }
    return { categories: [], subCategories: [] };
  } catch (error) {
    console.error('获取歌单分类失败:', error);
    throw new Error('获取歌单分类失败');
  }
}

// 获取歌单列表（支持分类）
export async function getPlaylists(params = {}) {
  const { limit = 30, offset = 0, cat = '全部', order = 'hot' } = params;
  
  try {
    const response = await api.get('/top/playlist', {
      params: {
        limit,
        offset,
        cat,
        order
      }
    });

    if (response.data.playlists) {
      return {
        playlists: response.data.playlists.map(playlist => ({
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
          category: playlist.category
        })),
        total: response.data.total,
        more: response.data.more
      };
    }
    return { playlists: [], total: 0, more: false };
  } catch (error) {
    console.error('获取歌单列表失败:', error);
    throw new Error('获取歌单列表失败');
  }
}

// 获取歌单详情
export async function getPlaylistDetail(id) {
  try {
    const response = await api.get(`/playlist/detail`, {
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