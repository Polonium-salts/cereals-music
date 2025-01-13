'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { getPlaylistSongs, getMusicUrl } from '../services/musicApi';

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [audio] = useState(typeof Audio !== 'undefined' ? new Audio() : null);

  useEffect(() => {
    if (audio) {
      audio.volume = volume;
      
      const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
      const handleDurationChange = () => setDuration(audio.duration);
      const handleEnded = () => playNext();
      
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('durationchange', handleDurationChange);
      audio.addEventListener('ended', handleEnded);
      
      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('durationchange', handleDurationChange);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [audio]);

  // 播放单曲
  const playTrack = async (track) => {
    try {
      const musicUrl = await getMusicUrl(track.id);
      if (!musicUrl) {
        throw new Error('无法获取音乐播放地址');
      }

      if (audio) {
        audio.src = musicUrl;
        audio.play();
        setIsPlaying(true);
        setCurrentTrack(track);
      }
    } catch (error) {
      console.error('播放音乐失败:', error);
      // 可以添加错误提示
    }
  };

  // 播放歌单
  const playPlaylist = async (playlistId) => {
    try {
      const songs = await getPlaylistSongs(playlistId);
      if (songs && songs.length > 0) {
        setPlaylist(songs);
        await playTrack(songs[0]);
      }
    } catch (error) {
      console.error('获取歌单音乐失败:', error);
      // 可以添加错误提示
    }
  };

  // 播放/暂停
  const togglePlay = () => {
    if (audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // 播放下一首
  const playNext = () => {
    if (playlist.length > 0) {
      const currentIndex = playlist.findIndex(track => track.id === currentTrack?.id);
      const nextIndex = (currentIndex + 1) % playlist.length;
      playTrack(playlist[nextIndex]);
    }
  };

  // 播放上一首
  const playPrev = () => {
    if (playlist.length > 0) {
      const currentIndex = playlist.findIndex(track => track.id === currentTrack?.id);
      const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
      playTrack(playlist[prevIndex]);
    }
  };

  // 设置音量
  const setAudioVolume = (newVolume) => {
    if (audio) {
      audio.volume = newVolume;
      setVolume(newVolume);
    }
  };

  // 设置播放进度
  const seekTo = (time) => {
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  };

  const value = {
    currentTrack,
    playlist,
    isPlaying,
    currentTime,
    duration,
    volume,
    playTrack,
    playPlaylist,
    togglePlay,
    playNext,
    playPrev,
    setVolume: setAudioVolume,
    seekTo,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
} 