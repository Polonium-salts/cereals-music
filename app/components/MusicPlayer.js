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

  useEffect(() => {
    if (currentSong?.url) {
      audioRef.current.src = currentSong.url;
      audioRef.current.play().catch(error => {
        console.error('播放失败:', error);
      });
      setIsPlaying(true);
    }
  }, [currentSong]);

  useEffect(() => {
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const handlePlayPause = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => {
        console.error('播放失败:', error);
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
    setDuration(audioRef.current.duration);
  };

  const handleSliderChange = (event, newValue) => {
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

  if (!currentSong) return null;

  return (
    <div className="music-player">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={onNext}
        onError={(e) => console.error('音频播放错误:', e)}
      />
      <div className="player-content">
        <div className="song-info">
          {currentSong.album?.picUrl ? (
            <img
              src={currentSong.album.picUrl}
              alt={currentSong.name}
              className="album-cover"
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
              <IconButton onClick={toggleShuffle} color={isShuffle ? 'primary' : 'default'}>
                <Shuffle />
              </IconButton>
            </Tooltip>
            <Tooltip title="上一首">
              <IconButton onClick={onPrevious}>
                <SkipPrevious />
              </IconButton>
            </Tooltip>
            <Tooltip title={isPlaying ? '暂停' : '播放'}>
              <IconButton 
                className="play-button"
                onClick={handlePlayPause}
              >
                {isPlaying ? <Pause /> : <PlayArrow />}
              </IconButton>
            </Tooltip>
            <Tooltip title="下一首">
              <IconButton onClick={onNext}>
                <SkipNext />
              </IconButton>
            </Tooltip>
            <Tooltip title={isRepeat ? '关闭单曲循环' : '开启单曲循环'}>
              <IconButton onClick={toggleRepeat} color={isRepeat ? 'primary' : 'default'}>
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