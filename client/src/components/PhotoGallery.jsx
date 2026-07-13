export default function PhotoGallery({ photos = [] }) {
  if (!photos.length) return <p className="text-sm text-gray-400">No photos</p>;
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((p, i) => (
        <a key={i} href={p.file_path || p} target="_blank" rel="noopener noreferrer">
          <img src={p.file_path || p} alt={`Photo ${i + 1}`} className="w-full h-24 object-cover rounded-lg hover:opacity-80 transition" />
        </a>
      ))}
    </div>
  );
}
