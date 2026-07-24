import React, { useState, useRef } from 'react';
import { Upload, Trash2, RefreshCw, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ImageAngleItem {
  id: string;
  url: string;
  angle: 'FRONT' | 'BACK' | 'SIDE' | 'PACKAGE' | 'GALLERY';
  isPrimary: boolean;
}

interface ProductImageUploadProps {
  images: ImageAngleItem[];
  onChange: (images: ImageAngleItem[]) => void;
  maxImages?: number;
}

const ANGLES: Array<{ key: ImageAngleItem['angle']; label: string }> = [
  { key: 'FRONT', label: 'Front Packaging' },
  { key: 'BACK', label: 'Back / Ingredients' },
  { key: 'SIDE', label: 'Side Profile' },
  { key: 'PACKAGE', label: 'Barcode / Box' },
  { key: 'GALLERY', label: 'Extra View' },
];

/**
 * Client-side Canvas Image Compression
 */
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress to JPEG at 80% quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export const ProductImageUpload: React.FC<ProductImageUploadProps> = ({
  images,
  onChange,
  maxImages = 5,
}) => {
  const [selectedAngle, setSelectedAngle] = useState<ImageAngleItem['angle']>('FRONT');
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    try {
      const compressedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i]);
        compressedUrls.push(compressed);
      }

      const updated = [...images];
      compressedUrls.forEach((url, idx) => {
        const angleKey = idx === 0 ? selectedAngle : 'GALLERY';
        // Replace existing angle if present, otherwise add new
        const existingIdx = updated.findIndex((img) => img.angle === angleKey);
        if (existingIdx !== -1 && angleKey !== 'GALLERY') {
          updated[existingIdx] = { ...updated[existingIdx], url };
        } else {
          updated.push({
            id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            url,
            angle: angleKey,
            isPrimary: updated.length === 0,
          });
        }
      });

      onChange(updated);
    } catch (err) {
      console.error('Image compression error:', err);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (id: string) => {
    const updated = images.filter((img) => img.id !== id);
    if (updated.length > 0 && !updated.some((img) => img.isPrimary)) {
      updated[0].isPrimary = true;
    }
    onChange(updated);
  };

  const handleSetPrimary = (id: string) => {
    const updated = images.map((img) => ({
      ...img,
      isPrimary: img.id === id,
    }));
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Product Images ({images.length}/{maxImages})
        </label>
        <span className="text-[10px] text-brand-primary font-medium">
          Auto-compressed for fast loading
        </span>
      </div>

      {/* Angle Selector Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {ANGLES.map((angle) => {
          const hasImage = images.some((img) => img.angle === angle.key);
          return (
            <button
              key={angle.key}
              type="button"
              onClick={() => setSelectedAngle(angle.key)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 border',
                selectedAngle === angle.key
                  ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/30'
                  : 'bg-surface border-border text-text-secondary hover:text-text-primary'
              )}
            >
              <span>{angle.label}</span>
              {hasImage && <Check className="w-3 h-3 text-success" />}
            </button>
          );
        })}
      </div>

      {/* Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2',
          images.length >= maxImages
            ? 'opacity-50 pointer-events-none border-border bg-surface-subtle'
            : 'border-brand-primary/30 bg-brand-primary/5 hover:bg-brand-primary/10 hover:border-brand-primary'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {isCompressing ? (
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-primary">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Compressing image...</span>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-text-primary">
                Click to upload or drag & drop image
              </p>
              <p className="text-[10px] text-text-secondary">
                Target angle: <span className="font-semibold text-brand-primary">{selectedAngle}</span> (JPG, PNG, WEBP)
              </p>
            </div>
          </>
        )}
      </div>

      {/* Uploaded Images Gallery Preview */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-2">
          {images.map((img) => (
            <div
              key={img.id}
              className={cn(
                'relative group rounded-xl overflow-hidden border bg-surface aspect-square flex items-center justify-center',
                img.isPrimary ? 'border-brand-primary ring-2 ring-brand-primary/30' : 'border-border'
              )}
            >
              <img src={img.url} alt={img.angle} className="w-full h-full object-cover" />

              {/* Angle Tag */}
              <span className="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-md backdrop-blur-xs uppercase">
                {img.angle}
              </span>

              {/* Primary Badge */}
              {img.isPrimary && (
                <span className="absolute bottom-1 left-1 bg-brand-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                  Cover
                </span>
              )}

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                {!img.isPrimary && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(img.id)}
                    title="Set as Main Cover"
                    className="p-1.5 bg-white/90 text-black hover:bg-white rounded-lg transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(img.id)}
                  title="Delete Image"
                  className="p-1.5 bg-error text-white hover:bg-error/90 rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
