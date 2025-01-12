'use client';

export default function PlaylistCard({ playlist }) {
  const formatPlayCount = (count) => {
    if (count >= 100000000) {
      return `${Math.floor(count / 100000000)}亿`;
    }
    if (count >= 10000) {
      return `${Math.floor(count / 10000)}万`;
    }
    return count.toString();
  };

  return (
    <div className="group relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300">
      <div className="aspect-square overflow-hidden">
        <img 
          src={playlist.coverUrl || '/images/default-playlist.jpg'} 
          alt={playlist.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <div className="absolute top-2 right-2 text-white text-sm bg-black/50 px-2 py-1 rounded">
          <span>▶ {formatPlayCount(playlist.playCount)}</span>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <h3 className="text-white font-medium truncate">{playlist.name}</h3>
        <p className="text-gray-300 text-sm truncate">
          by {playlist.creator.name}
        </p>
      </div>
    </div>
  );
} 