import axios from 'axios';

// 创建两个平台的 axios 实例
const neteaseApi = axios.create({
  baseURL: 'https://wapi.vip247.icu/',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

const kugouApi = axios.create({
  baseURL: 'https://kapi.vip247.icu/',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 创建 Spotify API 实例
const spotifyApi = axios.create({
  baseURL: 'https://api.spotify.com/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 设置 Spotify API 的认证拦截器
spotifyApi.interceptors.request.use(async (config) => {
  // TODO: 实现 token 获取和刷新逻辑
  const token = localStorage.getItem('spotify_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 添加响应拦截器
const setupInterceptor = (api) => {
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

setupInterceptor(neteaseApi);
setupInterceptor(kugouApi);
setupInterceptor(spotifyApi);

// 搜索网易云音乐
async function searchNetease(keywords, limit = 50) {
  try {
    const response = await neteaseApi.get('/search', {
      params: {
        keywords,
        limit,
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
        id: `netease_${song.id}`,
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

// 搜索酷狗音乐
async function searchKugou(keywords, limit = 50) {
  try {
    const response = await kugouApi.get('/search', {
      params: {
        keywords,
        limit,
        platform: 'kugou'
      }
    });

    if (!response.data?.data?.lists) {
      return [];
    }

    return response.data.data.lists.map(song => ({
      id: `kugou_${song.FileHash}`,
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
    console.error('酷狗音乐搜索失败:', error);
    return [];
  }
}

// 搜索 Spotify 音乐
async function searchSpotify(keywords, limit = 50) {
  try {
    const response = await spotifyApi.get('/search', {
      params: {
        q: keywords,
        type: 'track',
        limit,
        market: 'US'
      }
    });

    if (!response.data?.tracks?.items) {
      return [];
    }

    return response.data.tracks.items.map(track => ({
      id: `spotify_${track.id}`,
      name: track.name,
      artists: track.artists.map(artist => ({
        id: artist.id,
        name: artist.name
      })),
      album: {
        id: track.album.id,
        name: track.album.name,
        picUrl: track.album.images[0]?.url || null
      },
      duration: track.duration_ms,
      platform: 'spotify',
      previewUrl: track.preview_url
    }));
  } catch (error) {
    console.error('Spotify 搜索失败:', error);
    return [];
  }
}

// 合并搜索结果
export const searchMusic = async (keywords) => {
  try {
    const [neteaseSongs, kugouSongs, spotifySongs] = await Promise.all([
      searchNetease(keywords),
      searchKugou(keywords),
      searchSpotify(keywords)
    ]);

    // 合并并随机打乱结果
    const allSongs = [...neteaseSongs, ...kugouSongs, ...spotifySongs]
      .sort(() => Math.random() - 0.5);

    return allSongs;
  } catch (error) {
    console.error('音乐搜索失败:', error);
    throw new Error('音乐搜索失败');
  }
};

// 获取音乐URL
export const getMusicUrl = async (id) => {
  try {
    const [platform, songId] = id.split('_');
    
    if (platform === 'spotify') {
      const response = await spotifyApi.get(`/tracks/${songId}`);
      return response.data.preview_url || null;
    } else if (platform === 'netease') {
      const response = await neteaseApi.get('/song/url', {
        params: { 
          id: songId,
          realIP: '116.25.146.177'
        }
      });
      return response.data?.data?.[0]?.url;
    } else if (platform === 'kugou') {
      const response = await kugouApi.get('/song/url', {
        params: { hash: songId }
      });
      return response.data?.data?.url;
    }

    throw new Error('不支持的音乐平台');
  } catch (error) {
    console.error('获取音乐URL失败:', error);
    throw error;
  }
};

// 获取音乐详情
export const getMusicDetail = async (id) => {
  try {
    const [platform, songId] = id.split('_');
    
    if (platform === 'netease') {
      const response = await neteaseApi.get('/song/detail', {
        params: { ids: songId }
      });

      const song = response.data?.songs?.[0];
      if (!song) throw new Error('无法获取音乐详情');

      return {
        id: `netease_${song.id}`,
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
    } else if (platform === 'kugou') {
      const response = await kugouApi.get('/song/detail', {
        params: { hash: songId }
      });

      const song = response.data?.data;
      if (!song) throw new Error('无法获取音乐详情');

      return {
        id: `kugou_${song.hash}`,
        name: song.song_name,
        artists: [{
          id: song.author_id,
          name: song.author_name
        }],
        album: {
          id: song.album_id,
          name: song.album_name,
          picUrl: song.img
        },
        duration: song.duration * 1000,
        platform: 'kugou'
      };
    }

    throw new Error('不支持的音乐平台');
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

// 获取 Spotify 歌单
export async function getSpotifyPlaylists(params = {}) {
  const { limit = 30, offset = 0, category = null } = params;
  
  try {
    let response;
    if (category) {
      response = await spotifyApi.get(`/browse/categories/${category}/playlists`, {
        params: { limit, offset, country: 'US' }
      });
    } else {
      response = await spotifyApi.get('/browse/featured-playlists', {
        params: { limit, offset, country: 'US' }
      });
    }

    if (response.data?.playlists?.items) {
      return {
        playlists: response.data.playlists.items.map(playlist => ({
          id: `spotify_${playlist.id}`,
          name: playlist.name,
          description: playlist.description,
          coverUrl: playlist.images[0]?.url,
          songCount: playlist.tracks.total,
          playCount: 0, // Spotify 不提供播放次数
          creator: {
            id: playlist.owner.id,
            name: playlist.owner.display_name,
            avatarUrl: null
          },
          tags: [],
          platform: 'spotify'
        })),
        total: response.data.playlists.total,
        more: response.data.playlists.next !== null
      };
    }
    return { playlists: [], total: 0, more: false };
  } catch (error) {
    console.error('获取 Spotify 歌单列表失败:', error);
    throw new Error('获取 Spotify 歌单列表失败');
  }
}

// 获取 Spotify 歌单详情
export async function getSpotifyPlaylistDetail(playlistId) {
  try {
    const response = await spotifyApi.get(`/playlists/${playlistId}`);
    const playlist = response.data;

    return {
      id: `spotify_${playlist.id}`,
      name: playlist.name,
      description: playlist.description,
      coverUrl: playlist.images[0]?.url,
      songCount: playlist.tracks.total,
      playCount: 0,
      creator: {
        id: playlist.owner.id,
        name: playlist.owner.display_name,
        avatarUrl: null
      },
      tags: [],
      tracks: playlist.tracks.items.map(item => ({
        id: `spotify_${item.track.id}`,
        name: item.track.name,
        artists: item.track.artists.map(artist => ({
          id: artist.id,
          name: artist.name
        })),
        album: {
          id: item.track.album.id,
          name: item.track.album.name,
          picUrl: item.track.album.images[0]?.url
        },
        duration: item.track.duration_ms,
        platform: 'spotify',
        previewUrl: item.track.preview_url
      }))
    };
  } catch (error) {
    console.error('获取 Spotify 歌单详情失败:', error);
    throw new Error('获取 Spotify 歌单详情失败');
  }
}

// 获取 Spotify 歌单分类
export async function getSpotifyCategories() {
  try {
    const response = await spotifyApi.get('/browse/categories', {
      params: { country: 'US', limit: 50 }
    });

    if (response.data?.categories?.items) {
      return response.data.categories.items.map(category => ({
        id: category.id,
        name: category.name,
        icons: category.icons
      }));
    }
    return [];
  } catch (error) {
    console.error('获取 Spotify 分类失败:', error);
    throw new Error('获取 Spotify 分类失败');
  }
} 