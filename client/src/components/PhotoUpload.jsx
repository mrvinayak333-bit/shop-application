import { useState, useRef } from 'react';
import { Camera, X } from 'lucide-react';

export default function PhotoUpload({ label, name, photos, setPhotos }) {
  const inputRef = useRef(null);

  const handleAdd = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotos(prev => ({ ...prev, [name]: file }));
  };

  const handleRemove = () => {
    setPhotos(prev => ({ ...prev, [name]: null }));
    if (inputRef.current) inputRef.current.value = '';
  };

  const preview = photos[name] ? URL.createObjectURL(photos[name]) : null;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {preview ? (
        <div className="relative w-32 h-32">
          <img src={preview} alt={label} className="w-full h-full object-cover rounded-lg" />
          <button type="button" onClick={handleRemove} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-emerald-400 hover:text-emerald-500 transition">
          <Camera className="w-6 h-6" />
          <span className="text-xs mt-1">Upload</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAdd} />
    </div>
  );
}
