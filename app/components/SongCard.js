'use client';

import Image from 'next/image';
import MusicIcon from './MusicIcon';

export default function SongCard({ song, onClick }) {
  const handleImageError = (e) => {
    e.target.style.display = 'none';
    e.target.nextSibling.style.display = 'flex';
  };

  return (
    <div className="song-card" onClick={onClick}>
      {song.album?.picUrl ? (
        <>
          <img
            src={song.album.picUrl}
            alt={song.name}
            className="song-card-image"
            onError={handleImageError}
          />
          <div className="song-card-fallback" style={{ display: 'none' }}>
            <MusicIcon />
          </div>
        </>
      ) : (
        <div className="song-card-fallback">
          <MusicIcon />
        </div>
      )}
      <div className="song-card-content">
        <h3 className="song-card-title">{song.name}</h3>
        <p className="song-card-artist">
          {song.artists?.map(artist => artist.name).join(', ')}
        </p>
      </div>
    </div>
  );
} 