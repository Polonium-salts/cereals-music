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
  },
  httpsAgent: new (require('https').Agent)({
    rejectUnauthorized: false
  })
});

// 创建QQ音乐API实例
const qqMusicApi = axios.create({
  baseURL: 'http://www.cqaibeibei.com/',
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
addRetryInterceptor(kuGouApi);
addRetryInterceptor(qqMusicApi);

// 搜索音乐（整合网易云、酷狗和QQ音乐）
export const searchMusic = async (keywords) => {
  try {
    // 并行发起三个平台的搜索请求
    const [neteaseResults, kuGouResults, qqResults] = await Promise.allSettled([
      searchNetease(keywords),
      searchKuGou(keywords),
      searchQQMusic(keywords)
    ]);

    // 添加日志以检查每个平台的结果
    console.log('网易云搜索结果数量:', neteaseResults.status === 'fulfilled' ? neteaseResults.value.length : 0);
    console.log('酷狗搜索结果数量:', kuGouResults.status === 'fulfilled' ? kuGouResults.value.length : 0);
    console.log('QQ音乐搜索结果数量:', qqResults.status === 'fulfilled' ? qqResults.value.length : 0);

    // 合并三个平台的结果
    const results = [
      ...(neteaseResults.status === 'fulfilled' ? neteaseResults.value : []),
      ...(kuGouResults.status === 'fulfilled' ? kuGouResults.value : []),
      ...(qqResults.status === 'fulfilled' ? qqResults.value : [])
    ];

    // 添加日志检查最终结果
    console.log('合并后的总结果数量:', results.length);
    console.log('平台分布:', results.reduce((acc, curr) => {
      acc[curr.platform] = (acc[curr.platform] || 0) + 1;
      return acc;
    }, {}));

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
        limit: 50,
        type: 1
      },
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      })
    });

    if (!response.data?.result?.songs) {
      return [];
    }

    const songIds = response.data.result.songs.map(song => song.hash).join(',');
    const detailResponse = await kuGouApi.get('/playlist/detail', {
      params: { ids: songIds },
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      })
    });

    const songDetails = detailResponse.data?.songs || [];
    const songDetailsMap = new Map(songDetails.map(song => [song.hash, song]));

    return response.data.result.songs.map(song => {
      const detail = songDetailsMap.get(song.hash);
      return {
        id: song.hash,
        name: song.songname,
        artists: [{
          id: song.singerId || detail?.singerId || 0,
          name: song.singername || detail?.singername || '未知歌手'
        }],
        album: {
          id: detail?.album_id || song.album_id || 0,
          name: detail?.album_name || song.album_name || '未知专辑',
          picUrl: detail?.img || song.image || null
        },
        duration: (detail?.duration || song.duration) * 1000,
        platform: 'kugou'
      };
    });
  } catch (error) {
    console.error('酷狗音乐搜索失败:', error);
    return [];
  }
}

// QQ音乐搜索
async function searchQQMusic(keywords) {
  try {
    const response = await qqMusicApi.get('/getSearchByKey', {
      params: {
        keywords,
        limit: 50,
        type: 1
      }
    });

    if (!response.data?.result?.songs) {
      return [];
    }

    const songIds = response.data.result.songs.map(song => song.songmid).join(',');
    const detailResponse = await qqMusicApi.get('/getSongLists', {
      params: { ids: songIds }
    });

    const songDetails = detailResponse.data?.songs || [];
    const songDetailsMap = new Map(songDetails.map(song => [song.songmid, song]));

    return response.data.result.songs.map(song => {
      const detail = songDetailsMap.get(song.songmid);
      return {
        id: song.songmid,
        name: song.songname,
        artists: song.singer.map(singer => ({
          id: singer.mid,
          name: singer.name
        })),
        album: {
          id: song.albummid,
          name: song.albumname,
          picUrl: detail?.album?.picUrl || `https://y.gtimg.cn/music/photo_new/T002R300x300M000${song.albummid}.jpg`
        },
        duration: song.interval * 1000,
        platform: 'qq'
      };
    });
  } catch (error) {
    console.error('QQ音乐搜索失败:', error);
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
        params: { id },
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false
        })
      });
      const url = response.data?.data?.[0]?.url;
      if (!url) throw new Error('无法获取音乐URL');
      return url;
    } else if (platform === 'qq') {
      const response = await qqMusicApi.get('/getImageUrl', {
        params: { id }
      });
      const url = response.data?.data?.[0]?.url;
      if (!url) throw new Error('无法获取音乐URL');
      return url;
    }
  } catch (error) {
    console.error('获取音乐URL失败:', error);
    throw error;
  }
};

// 获取歌单列表（整合三个平台）
export async function getPlaylists(limit = 30, cat = '全部') {
  try {
    const [neteaseResults, kuGouResults, qqResults] = await Promise.allSettled([
      getNeteasePlaylists(limit, cat),
      getKuGouPlaylists(limit),
      getQQPlaylists(limit)
    ]);

    const results = [
      ...(neteaseResults.status === 'fulfilled' ? neteaseResults.value : []),
      ...(kuGouResults.status === 'fulfilled' ? kuGouResults.value : []),
      ...(qqResults.status === 'fulfilled' ? qqResults.value : [])
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
    const response = await kuGouApi.get('/plist/index', {
      params: {
        page: 1,
        pagesize: limit
      }
    });

    if (!response.data?.data?.info) {
      return [];
    }

    return response.data.data.info.map(playlist => ({
      id: playlist.specialid,
      name: playlist.specialname,
      description: playlist.intro || '',
      coverUrl: playlist.imgurl,
      songCount: playlist.songcount || 0,
      playCount: playlist.playcount || 0,
      creator: {
        id: playlist.creator?.id || 0,
        name: playlist.creator?.name || '未知用户',
        avatarUrl: playlist.creator?.avatar || null
      },
      tags: playlist.tags ? playlist.tags.split(',') : [],
      platform: 'kugou'
    }));
  } catch (error) {
    console.error('获取酷狗歌单失败:', error);
    return [];
  }
}

// QQ音乐歌单
async function getQQPlaylists(limit) {
  try {
    const response = await qqMusicApi.get('/songlist/list', {
      params: {
        pageSize: limit,
        pageNo: 1,
        sort: 5 // 推荐歌单
      }
    });

    if (!response.data?.list) {
      return [];
    }

    return response.data.list.map(playlist => ({
      id: playlist.tid,
      name: playlist.title,
      description: playlist.desc || '',
      coverUrl: playlist.pic_url,
      songCount: playlist.song_cnt || 0,
      playCount: playlist.access_cnt || 0,
      creator: {
        id: playlist.creator_info?.uid || 0,
        name: playlist.creator_info?.nick || '未知用户',
        avatarUrl: playlist.creator_info?.avatar || null
      },
      tags: playlist.tags || [],
      platform: 'qq'
    }));
  } catch (error) {
    console.error('获取QQ音乐歌单失败:', error);
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

// 获取热门歌曲（整合三个平台）
export const getHotSongs = async (limit = 30) => {
  try {
    // 并行获取三个平台的热门歌曲
    const [neteaseResults, kuGouResults, qqResults] = await Promise.allSettled([
      getNeteaseSongs(Math.ceil(limit / 3)),
      getKuGouSongs(Math.ceil(limit / 3)),
      getQQHotSongs(Math.ceil(limit / 3))
    ]);

    // 合并三个平台的结果
    const results = [
      ...(neteaseResults.status === 'fulfilled' ? neteaseResults.value : []),
      ...(kuGouResults.status === 'fulfilled' ? kuGouResults.value : []),
      ...(qqResults.status === 'fulfilled' ? qqResults.value : [])
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
    const response = await kuGouApi.get('/rank/songs', {
      params: {
        rankid: 8888,
        page: 1,
        pagesize: limit
      }
    });

    if (!response.data?.data?.info) {
      return [];
    }

    return response.data.data.info.map(song => ({
      id: song.hash,
      name: song.songname,
      artists: [{
        id: song.singerId || 0,
        name: song.singername
      }],
      album: {
        id: song.album_id || 0,
        name: song.album_name || '未知专辑',
        picUrl: song.image || null
      },
      duration: song.duration * 1000,
      platform: 'kugou'
    }));
  } catch (error) {
    console.error('获取酷狗热门歌曲失败:', error);
    return [];
  }
}

// 获取QQ音乐热门歌曲
async function getQQHotSongs(limit) {
  try {
    const response = await qqMusicApi.get('/top/songs', {
      params: {
        pageSize: limit,
        pageNo: 1,
        id: 26 // 热歌榜
      }
    });

    if (!response.data?.list) {
      return [];
    }

    return response.data.list.map(song => ({
      id: song.mid,
      name: song.name,
      artists: [{
        id: song.singer_id,
        name: song.singer
      }],
      album: {
        id: song.album_id || 0,
        name: song.album_name || '未知专辑',
        picUrl: song.pic || null
      },
      duration: song.interval * 1000,
      platform: 'qq'
    }));
  } catch (error) {
    console.error('获取QQ音乐热门歌曲失败:', error);
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
export async function getPlaylistDetail(id, platform = 'netease') {
  try {
    if (platform === 'netease') {
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
    } else if (platform === 'kugou') {
      // ... 添加酷狗音乐逻辑 ...
    } else if (platform === 'qq') {
      const response = await qqMusicApi.get('/songlist/detail', {
        params: { id }
      });

      if (!response.data) {
        return null;
      }

      const playlist = response.data;
      return {
        id: playlist.tid,
        name: playlist.title,
        description: playlist.desc || '',
        coverUrl: playlist.pic_url,
        songCount: playlist.song_cnt || 0,
        playCount: playlist.access_cnt || 0,
        creator: {
          id: playlist.creator_info?.uid || 0,
          name: playlist.creator_info?.nick || '未知用户',
          avatarUrl: playlist.creator_info?.avatar || null
        },
        tags: playlist.tags || [],
        platform: 'qq',
        tracks: (playlist.songlist || []).map(track => ({
          id: track.mid,
          name: track.name,
          artists: [{
            id: track.singer_id,
            name: track.singer
          }],
          album: {
            id: track.album_id || 0,
            name: track.album_name || '未知专辑',
            picUrl: track.pic || null
          },
          duration: track.interval * 1000
        }))
      };
    }
    return null;
  } catch (error) {
    console.error('获取歌单详情失败:', error);
    throw new Error('获取歌单详情失败');
  }
} 