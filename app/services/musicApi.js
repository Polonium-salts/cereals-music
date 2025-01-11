import axios from 'axios';

// 创建网易云音乐API实例
const neteaseApi = axios.create({
  baseURL: 'https://wapi.vip247.icu/',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 创建酷狗音乐API实例
const kuGouApi = axios.create({
  baseURL: 'https://kapi.vip247.icu/',
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
      if (!response && config && !config._retry) {
        config._retry = true;
        return new Promise(resolve => setTimeout(() => resolve(api(config)), 1000));
      }
      return Promise.reject(error);
    }
  );
};

addRetryInterceptor(neteaseApi);
addRetryInterceptor(kuGouApi);

// 搜索音乐（整合网易云和酷狗）
export const searchMusic = async (keywords) => {
  try {
    // 并行发起两个平台的搜索请求
    const [neteaseResults, kuGouResults] = await Promise.allSettled([
      searchNetease(keywords),
      searchKuGou(keywords)
    ]);

    // 合并两个平台的结果
    const results = [
      ...(neteaseResults.status === 'fulfilled' ? neteaseResults.value : []),
      ...(kuGouResults.status === 'fulfilled' ? kuGouResults.value : [])
    ];

    // 按照歌曲名称和歌手排序
    return results.sort((a, b) => {
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
async function searchNetease(keywords) {
  try {
    const response = await neteaseApi.get('/search', {
      params: {
        keywords,
        limit: 50,
        type: 1
      }
    });

    if (!response.data?.result?.songs) {
      return [];
    }

    const songIds = response.data.result.songs.map(song => song.id).join(',');
    const detailResponse = await neteaseApi.get('/song/detail', {
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
    return [];
  }
}

// 酷狗音乐搜索
async function searchKuGou(keywords) {
  try {
    const response = await kuGouApi.get('/search', {
      params: {
        keywords,
        limit: 50
      }
    });

    if (!response.data?.data?.lists) {
      return [];
    }

    return response.data.data.lists.map(song => ({
      id: song.FileHash,
      name: song.SongName,
      artists: [{
        id: song.SingerId,
        name: song.SingerName
      }],
      album: {
        id: song.AlbumID,
        name: song.AlbumName,
        picUrl: song.Image || null
      },
      duration: song.Duration * 1000, // 转换为毫秒
      platform: 'kugou'
    }));
  } catch (error) {
    console.error('酷狗音乐搜索失败:', error);
    return [];
  }
}

// 获取音乐URL
export const getMusicUrl = async (id, platform = 'netease') => {
  try {
    if (platform === 'netease') {
      const response = await neteaseApi.get('/song/url', {
        params: { 
          id,
          realIP: '116.25.146.177'
        }
      });
      const url = response.data?.data?.[0]?.url;
      if (!url) throw new Error('无法获取音乐URL');
      return url;
    } else if (platform === 'kugou') {
      const response = await kuGouApi.get('/song/url', {
        params: { hash: id }
      });
      const url = response.data?.data?.play_url;
      if (!url) throw new Error('无法获取音乐URL');
      return url;
    }
  } catch (error) {
    console.error('获取音乐URL失败:', error);
    throw error;
  }
};

// 获取歌单列表（整合两个平台）
export async function getPlaylists(limit = 30, cat = '全部') {
  try {
    const [neteaseResults, kuGouResults] = await Promise.allSettled([
      getNeteasePlaylists(limit, cat),
      getKuGouPlaylists(limit)
    ]);

    const results = [
      ...(neteaseResults.status === 'fulfilled' ? neteaseResults.value : []),
      ...(kuGouResults.status === 'fulfilled' ? kuGouResults.value : [])
    ];

    // 随机打乱结果
    return results.sort(() => Math.random() - 0.5);
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
      tags: playlist.tags,
      platform: 'netease'
    }));
  } catch (error) {
    console.error('获取网易云歌单失败:', error);
    return [];
  }
}

// 酷狗歌单
async function getKuGouPlaylists(limit) {
  try {
    const response = await kuGouApi.get('/playlist/list', {
      params: { limit }
    });

    if (!response.data?.data?.list) return [];

    return response.data.data.list.map(playlist => ({
      id: playlist.specialid,
      name: playlist.specialname,
      description: playlist.intro,
      coverUrl: playlist.imgurl,
      songCount: playlist.songcount,
      playCount: playlist.playcount,
      creator: {
        id: playlist.userid,
        name: playlist.username,
        avatarUrl: playlist.user_avatar
      },
      tags: playlist.tags?.split(',') || [],
      platform: 'kugou'
    }));
  } catch (error) {
    console.error('获取酷狗歌单失败:', error);
    return [];
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

// 获取热门歌曲（整合两个平台）
export const getHotSongs = async (limit = 30) => {
  try {
    // 并行获取两个平台的热门歌曲
    const [neteaseResults, kuGouResults] = await Promise.allSettled([
      getNeteaseSongs(Math.ceil(limit / 2)),
      getKuGouSongs(Math.ceil(limit / 2))
    ]);

    // 合并两个平台的结果
    const results = [
      ...(neteaseResults.status === 'fulfilled' ? neteaseResults.value : []),
      ...(kuGouResults.status === 'fulfilled' ? kuGouResults.value : [])
    ];

    // 随机打乱结果并限制数量
    return results
      .sort(() => Math.random() - 0.5)
      .slice(0, limit);
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
      duration: item.song.duration,
      platform: 'netease'
    }));
  } catch (error) {
    console.error('获取网易云热门歌曲失败:', error);
    return [];
  }
}

// 获取酷狗热门歌曲
async function getKuGouSongs(limit) {
  try {
    const response = await kuGouApi.get('/song/list', {
      params: {
        limit,
        order: 'hot'
      }
    });

    if (!response.data?.data?.lists) {
      return [];
    }

    return response.data.data.lists.map(song => ({
      id: song.FileHash,
      name: song.SongName,
      artists: [{
        id: song.SingerId,
        name: song.SingerName
      }],
      album: {
        id: song.AlbumID,
        name: song.AlbumName,
        picUrl: song.Image || null
      },
      duration: song.Duration * 1000,
      platform: 'kugou'
    }));
  } catch (error) {
    console.error('获取酷狗热门歌曲失败:', error);
    return [];
  }
}

// 获取歌单分类
export async function getPlaylistCategories() {
  try {
    const response = await api.get('/playlist/catlist');
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