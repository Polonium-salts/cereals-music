'use client';

export default function MusicCard({ song }) {
  return (
    <div className="group relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300">
      <div className="aspect-square overflow-hidden">
        <img 
          src={song.album.picUrl || '/images/default-cover.jpg'} 
          alt={song.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <h3 className="text-white font-medium truncate">{song.name}</h3>
        <p className="text-gray-300 text-sm truncate">
          {song.artists.map(artist => artist.name).join(', ')}
        </p>
      </div>
    </div>
  );
} 