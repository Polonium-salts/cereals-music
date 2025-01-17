'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  PlayArrow, 
  Pause, 
  SkipPrevious, 
  SkipNext, 
  VolumeUp,
  VolumeOff,
  Favorite,
  FavoriteBorder,
  QueueMusic,
  Repeat,
  Shuffle
} from '@mui/icons-material';
import { IconButton, Slider, Typography, Tooltip } from '@mui/material';
import MusicIcon from './MusicIcon';
import { getMusicUrl } from '../services/musicApi';

export default function MusicPlayer({ currentSong, onNext, onPrevious }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const audioRef = useRef(null);
  const previousVolumeRef = useRef(volume);
  const audioCache = useRef(new Map());
  const preloadQueue = useRef([]);
  const maxCacheSize = 20; // 增加缓存大小
  const [playbackRate, setPlaybackRate] = useState(1.0);

  // 预加载音频函数
  const preloadAudio = async (url) => {
    if (!url || audioCache.current.has(url)) return;

    try {
      const audio = new Audio();
      audio.preload = "auto";
      
      // 设置音频加载超时
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('音频加载超时')), 10000);
      });

      const loadPromise = new Promise((resolve) => {
        audio.oncanplaythrough = () => resolve(audio);
        audio.src = url;
      });

      const loadedAudio = await Promise.race([loadPromise, timeoutPromise]);
      
      // 缓存管理
      if (audioCache.current.size >= maxCacheSize) {
        const firstKey = audioCache.current.keys().next().value;
        audioCache.current.delete(firstKey);
      }
      
      audioCache.current.set(url, loadedAudio);
    } catch (error) {
      console.error('预加载音频失败:', error);
    }
  };

  // 批量预加载下一首歌曲
  const preloadNextSongs = async () => {
    if (preloadQueue.current.length === 0) return;
    
    const nextSongUrls = preloadQueue.current.slice(0, 3); // 预加载接下来的3首歌
    await Promise.all(nextSongUrls.map(url => preloadAudio(url)));
  };

  // 获取音乐URL
  const fetchMusicUrl = async (song) => {
    if (!song?.id) return null;
    try {
      const url = await getMusicUrl(song.id);
      return url;
    } catch (error) {
      console.error('获取音乐URL失败:', error);
      // 如果获取URL失败，自动切换到下一首
      handleNext();
      return null;
    }
  };

  useEffect(() => {
    if (currentSong?.id) {
      const loadAndPlay = async () => {
        try {
          // 重置播放状态
          setIsPlaying(false);
          setCurrentTime(0);
          
          // 获取实际播放URL
          const url = await fetchMusicUrl(currentSong);
          if (!url) {
            throw new Error('无法获取音乐播放地址');
          }
          
          // 创建新的音频实例
          const audio = new Audio();
          
          // 设置音频属性
          audio.preload = "auto";
          audio.crossOrigin = "anonymous"; // 添加跨域支持
          audio.src = url;
          
          // 设置音频事件监听
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('音频加载超时')), 15000);
          });

          const loadPromise = new Promise((resolve, reject) => {
            audio.addEventListener('canplaythrough', resolve, { once: true });
            audio.addEventListener('error', (e) => {
              reject(new Error(`音频加载失败: ${e.target.error?.message || '未知错误'}`));
            }, { once: true });
          });

          // 等待音频加载完成或超时
          await Promise.race([loadPromise, timeoutPromise]);
          
          // 设置音频属性
          audio.volume = isMuted ? 0 : volume;
          audio.playbackRate = playbackRate;
          audio.loop = isRepeat;
          
          // 添加事件监听
          audio.addEventListener('timeupdate', handleTimeUpdate);
          audio.addEventListener('ended', handleNext);
          audio.addEventListener('error', (e) => {
            console.error('音频播放错误:', e);
            setIsPlaying(false);
            handleNext();
          });
          
          // 更新音频引用
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
            audioRef.current.removeEventListener('ended', handleNext);
          }
          
          audioRef.current = audio;
          
          // 尝试播放
          try {
            await audio.play();
            setIsPlaying(true);
          } catch (playError) {
            console.error('播放失败:', playError);
            // 在移动端，可能需要用户交互才能自动播放
            if (playError.name === 'NotAllowedError') {
              setIsPlaying(false);
            } else {
              handleNext();
            }
          }
        } catch (error) {
          console.error('音频加载或播放失败:', error);
          setIsPlaying(false);
          if (error.message !== '无法获取音乐播放地址') {
            handleNext();
          }
        }
      };
      
      loadAndPlay();
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('ended', handleNext);
      }
    };
  }, [currentSong?.id, volume, isMuted, playbackRate, isRepeat]);

  // 预加载下一首歌曲
  useEffect(() => {
    const preloadNext = async () => {
      if (onNext && typeof onNext === 'function') {
        try {
          const nextSong = onNext(true);
          if (nextSong?.id) {
            const url = await fetchMusicUrl(nextSong);
            if (url) {
              const audio = new Audio();
              audio.preload = "auto";
              audio.src = url;
            }
          }
        } catch (error) {
          console.error('预加载下一首失败:', error);
        }
      }
    };

    preloadNext();
  }, [currentSong?.id]);

  // 更新音量控制
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handlePlayPause = async () => {
    try {
      if (!audioRef.current) return;
      
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error('播放失败:', error);
          if (error.name === 'NotAllowedError') {
            // 移动端需要用户交互才能播放
            setError('请点击播放按钮开始播放');
          } else {
            handleNext();
          }
        }
      }
    } catch (error) {
      console.error('播放控制失败:', error);
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSliderChange = (event, newValue) => {
    if (!audioRef.current || !duration) return;
    
    const time = (newValue / 100) * duration;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (event, newValue) => {
    const volumeValue = newValue / 100;
    setVolume(volumeValue);
    if (isMuted && volumeValue > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(previousVolumeRef.current);
    } else {
      previousVolumeRef.current = volume;
      setIsMuted(true);
      setVolume(0);
    }
  };

  const toggleLike = () => {
    setIsLiked(!isLiked);
  };

  const toggleRepeat = () => {
    setIsRepeat(!isRepeat);
    audioRef.current.loop = !isRepeat;
  };

  const toggleShuffle = () => {
    setIsShuffle(!isShuffle);
    // TODO: 实现随机播放逻辑
  };

  const formatTime = (time) => {
    if (!time) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlaybackRateChange = (newRate) => {
    setPlaybackRate(newRate);
  };

  const handlePrevious = async () => {
    try {
      if (!onPrevious) return;
      
      // 如果当前播放时间超过3秒，点击上一首会重新播放当前歌曲
      if (audioRef.current && audioRef.current.currentTime > 3) {
        audioRef.current.currentTime = 0;
        return;
      }
      
      // 暂停当前播放
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      // 切换到上一首
      onPrevious();
    } catch (error) {
      console.error('切换上一首失败:', error);
    }
  };

  const handleNext = async () => {
    try {
      if (!onNext) return;
      
      // 暂停当前播放
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      // 切换到下一首
      onNext();
    } catch (error) {
      console.error('切换下一首失败:', error);
    }
  };

  // 监听键盘快捷键
  useEffect(() => {
    const handleKeyPress = (event) => {
      // 空格键控制播放/暂停
      if (event.code === 'Space' && event.target.tagName !== 'INPUT') {
        event.preventDefault();
        handlePlayPause();
      }
      // 左方向键切换上一首
      else if (event.code === 'ArrowLeft' && event.altKey) {
        event.preventDefault();
        handlePrevious();
      }
      // 右方向键切换下一首
      else if (event.code === 'ArrowRight' && event.altKey) {
        event.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying]);

  if (!currentSong) return null;

  return (
    <div className="music-player">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleNext}
        onError={(e) => console.error('音频播放错误:', e)}
      />
      <div className="player-content">
        <div className="song-info">
          {currentSong.album?.picUrl ? (
            <img
              src={currentSong.album.picUrl}
              alt={currentSong.name}
              className="album-cover"
              loading="lazy"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : (
            <div className="album-cover default-album-cover">
              <MusicIcon />
            </div>
          )}
          <div className="song-details">
            <Typography className="song-name" variant="subtitle1">
              {currentSong.name}
            </Typography>
            <Typography className="artist-name" variant="body2">
              {currentSong.artists?.map(artist => artist.name).join(', ')}
            </Typography>
          </div>
          <Tooltip title={isLiked ? '取消喜欢' : '添加到我喜欢的音乐'}>
            <IconButton onClick={toggleLike} size="small">
              {isLiked ? <Favorite color="primary" /> : <FavoriteBorder />}
            </IconButton>
          </Tooltip>
        </div>

        <div className="player-controls-wrapper">
          <div className="player-progress">
            <span className="time">{formatTime(currentTime)}</span>
            <Slider
              size="small"
              value={(currentTime / duration) * 100 || 0}
              onChange={handleSliderChange}
            />
            <span className="time">{formatTime(duration)}</span>
          </div>

          <div className="player-controls">
            <Tooltip title={isShuffle ? '关闭随机播放' : '开启随机播放'}>
              <IconButton 
                onClick={toggleShuffle} 
                color={isShuffle ? 'primary' : 'default'}
                className="control-button"
              >
                <Shuffle />
              </IconButton>
            </Tooltip>
            <Tooltip title="上一首 (Alt + ←)">
              <IconButton 
                onClick={handlePrevious}
                disabled={!onPrevious}
                className="control-button"
              >
                <SkipPrevious />
              </IconButton>
            </Tooltip>
            <Tooltip title={isPlaying ? '暂停 (空格)' : '播放 (空格)'}>
              <IconButton 
                className="play-button"
                onClick={handlePlayPause}
              >
                {isPlaying ? <Pause /> : <PlayArrow />}
              </IconButton>
            </Tooltip>
            <Tooltip title="下一首 (Alt + →)">
              <IconButton 
                onClick={handleNext}
                disabled={!onNext}
                className="control-button"
              >
                <SkipNext />
              </IconButton>
            </Tooltip>
            <Tooltip title={isRepeat ? '关闭单曲循环' : '开启单曲循环'}>
              <IconButton 
                onClick={toggleRepeat} 
                color={isRepeat ? 'primary' : 'default'}
                className="control-button"
              >
                <Repeat />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        <div className="volume-control">
          <Tooltip title={isMuted || volume === 0 ? '取消静音' : '静音'}>
            <IconButton onClick={toggleMute} size="small">
              {isMuted || volume === 0 ? <VolumeOff /> : <VolumeUp />}
            </IconButton>
          </Tooltip>
          <Slider
            size="small"
            value={volume * 100}
            onChange={handleVolumeChange}
          />
        </div>
      </div>
    </div>
  );
} 