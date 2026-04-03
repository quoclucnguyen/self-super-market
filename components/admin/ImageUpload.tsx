'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string, publicId: string) => void;
  onRemove: () => void;
  className?: string;
  priority?: boolean;
}

export function ImageUpload({ value, onChange, onRemove, className = '', priority }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'products');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      onChange(result.url, result.public_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const handleRemove = useCallback(() => {
    onRemove();
    setError(null);
  }, [onRemove]);

  if (value) {
    return (
      <div className={`relative group ${className}`}>
        <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted">
          <Image
            src={value}
            alt="Product image"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={priority}
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity min-h-9 min-w-9 focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Remove image"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Click the X to remove image</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-input border-dashed rounded-lg cursor-pointer bg-muted hover:bg-accent transition-colors">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {uploading ? (
            <>
              <svg className="animate-spin h-8 w-8 text-muted-foreground mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-muted-foreground">Uploading…</p>
            </>
          ) : (
            <>
              <svg className="w-8 h-8 mb-3 text-muted-foreground" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167C10 15V6m0 0L8 8m2-2 2 2" />
              </svg>
              <p className="text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-muted-foreground">PNG, JPG, WEBP, GIF (MAX. 5MB)</p>
            </>
          )}
        </div>
        <input
          type="file"
          className="hidden"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFileSelect}
          disabled={uploading}
        />
      </label>
      {error && (
        <p className="text-destructive text-sm mt-2">{error}</p>
      )}
    </div>
  );
}
