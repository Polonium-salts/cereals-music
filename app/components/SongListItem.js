'use client';

import { usePlayer } from '../contexts/PlayerContext';
import { formatDuration } from '../utils/format';
import { PlayArrow, Pause, Favorite, MoreVert } from '@mui/icons-material';
import { IconButton } from '@mui/material';

export default function SongListItem({ song, index }) {
  const { currentSong, isPlaying, togglePlay, playSong } = usePlayer();
  const isCurrentSong = currentSong?.id === song.id;

  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (isCurrentSong) {
      togglePlay();
    } else {
      playSong(song);
    }
  };

  return (
    <div 
      className={`group relative flex items-center gap-4 p-3 rounded-lg cursor-pointer
        hover:bg-gray-100 dark:hover:bg-gray-800
        transition-all duration-300 ease-out
        ${isCurrentSong ? 'bg-blue-50 dark:bg-blue-900/30' : ''}
        active:scale-[0.98] active:bg-gray-200 dark:active:bg-gray-700
        transform perspective-1000
        hover:translate-y-[-2px] hover:shadow-md
      `}
      onClick={() => !isCurrentSong && playSong(song)}
    >
      {/* 序号/播放按钮 */}
      <div className="w-12 flex justify-center items-center">
        <span className={`group-hover:hidden ${isCurrentSong ? 'text-blue-500' : 'text-gray-400'}`}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <IconButton
          className="hidden group-hover:flex"
          size="small"
          onClick={handlePlayClick}
        >
          {isCurrentSong && isPlaying ? (
            <Pause className="text-blue-500" />
          ) : (
            <PlayArrow className={isCurrentSong ? 'text-blue-500' : ''} />
          )}
        </IconButton>
      </div>

      {/* 封面 */}
      <div className="w-12 h-12 relative rounded-md overflow-hidden flex-shrink-0
        transform transition-transform duration-300 group-hover:scale-105">
        <img
          src={song.album.picUrl || '/images/default-cover.jpg'}
          alt={song.name}
          className="w-full h-full object-cover"
        />
        {isCurrentSong && isPlaying && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="flex gap-[3px] items-end h-4">
              <div className="w-1 bg-white animate-music-bar-1 rounded-t"></div>
              <div className="w-1 bg-white animate-music-bar-2 rounded-t"></div>
              <div className="w-1 bg-white animate-music-bar-3 rounded-t"></div>
            </div>
          </div>
        )}
      </div>

      {/* 歌曲信息 */}
      <div className="flex-grow min-w-0">
        <div className="flex items-baseline">
          <h3 className={`truncate font-medium ${isCurrentSong ? 'text-blue-500' : ''}`}>
            {song.name}
          </h3>
          {song.fee === 1 && (
            <span className="ml-2 px-1 text-xs text-gray-500 border border-gray-300 rounded">VIP</span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {song.artists.map(artist => artist.name).join(', ')}
        </p>
      </div>

      {/* 专辑名称 */}
      <div className="hidden md:block w-48 truncate text-sm text-gray-500 dark:text-gray-400">
        {song.album.name}
      </div>

      {/* 时长 */}
      <div className="w-20 text-right text-sm text-gray-500 dark:text-gray-400">
        {formatDuration(song.duration)}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <IconButton size="small">
          <Favorite className="text-gray-400 hover:text-red-500 transition-colors" />
        </IconButton>
        <IconButton size="small">
          <MoreVert className="text-gray-400" />
        </IconButton>
      </div>
    </div>
  );
} 