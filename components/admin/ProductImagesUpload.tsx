'use client';

import { useCallback, useMemo, useState } from 'react';
import { Loader2, Star, Trash2, Upload } from 'lucide-react';

import type { ProductImageInput } from '@/lib/validations/product';

interface ProductImagesUploadProps {
  value?: ProductImageInput[];
  onChange: (images: ProductImageInput[]) => void;
  maxImages?: number;
}

export function ProductImagesUpload({
  value = [],
  onChange,
  maxImages = 20,
}: ProductImagesUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedImages = useMemo(() => {
    return value.map((image, index) => ({
      ...image,
      order: image.order ?? index,
      isPrimary: Boolean(image.isPrimary),
    }));
  }, [value]);

  const commitImages = useCallback(
    (images: ProductImageInput[]) => {
      const hasPrimary = images.some((image) => image.isPrimary);
      const normalized = images.map((image, index) => ({
        ...image,
        order: index,
        isPrimary: hasPrimary ? Boolean(image.isPrimary) : index === 0,
      }));

      onChange(normalized);
    },
    [onChange],
  );

  const uploadSingleImage = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'products');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || 'Upload failed');
    }

    const payload = await response.json();
    return {
      imageUrl: payload.url as string,
      imagePublicId: payload.public_id as string,
      isPrimary: false,
      order: 0,
    } satisfies ProductImageInput;
  }, []);

  const handleSelectFiles = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      event.target.value = '';

      if (!files || files.length === 0) return;

      const availableSlots = maxImages - normalizedImages.length;
      if (availableSlots <= 0) {
        setError(`You can upload up to ${maxImages} images.`);
        return;
      }

      const selectedFiles = [...files].slice(0, availableSlots);
      setError(null);
      setUploading(true);

      try {
        const uploadedImages = await Promise.all(selectedFiles.map(uploadSingleImage));
        commitImages([...normalizedImages, ...uploadedImages]);
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [commitImages, maxImages, normalizedImages, uploadSingleImage],
  );

  const handleRemove = useCallback(
    (indexToRemove: number) => {
      commitImages(normalizedImages.filter((_, index) => index !== indexToRemove));
    },
    [commitImages, normalizedImages],
  );

  const handleSetPrimary = useCallback(
    (primaryIndex: number) => {
      commitImages(
        normalizedImages.map((image, index) => ({
          ...image,
          isPrimary: index === primaryIndex,
        })),
      );
    },
    [commitImages, normalizedImages],
  );

  return (
    <div className="space-y-3">
      {normalizedImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {normalizedImages.map((image, index) => (
            <div key={image.imagePublicId} className="relative rounded-lg border border-border overflow-hidden">
              <div className="relative h-28 bg-muted">
                <img
                  src={image.imageUrl}
                  alt={`Product image ${index + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <div className="p-2 flex items-center justify-between gap-2 bg-card">
                <button
                  type="button"
                  onClick={() => handleSetPrimary(index)}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
                    image.isPrimary
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <Star className="w-3 h-3" />
                  {image.isPrimary ? 'Primary' : 'Set primary'}
                </button>

                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="inline-flex items-center justify-center rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                  aria-label={`Remove image ${index + 1}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-input bg-muted px-4 py-6 text-center hover:bg-accent transition-colors">
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          disabled={uploading || normalizedImages.length >= maxImages}
          onChange={handleSelectFiles}
        />

        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex justify-center">
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          </div>
          <p className="font-medium text-foreground">
            {uploading ? 'Uploading...' : 'Upload product images'}
          </p>
          <p>PNG, JPG, WEBP, GIF - tối đa {maxImages} ảnh</p>
        </div>
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
