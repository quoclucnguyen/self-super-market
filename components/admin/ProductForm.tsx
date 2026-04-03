'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductInput } from '@/lib/validations/product';
import { ImageUpload } from './ImageUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface ProductFormProps {
  initialData?: Partial<ProductInput>;
  onSubmit: (data: ProductInput) => Promise<void>;
  submitLabel?: string;
  isSubmitting?: boolean;
  imagePriority?: boolean;
  hideCancelButton?: boolean;
  onCancel?: () => void;
}

export function ProductForm({
  initialData,
  onSubmit,
  submitLabel = 'Save Product',
  isSubmitting = false,
  imagePriority,
  hideCancelButton = false,
  onCancel,
}: ProductFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || '',
      barcode: initialData?.barcode || '',
      price: initialData?.price || 0,
      description: initialData?.description || '',
      category: initialData?.category || '',
      stockQuantity: initialData?.stockQuantity || 0,
      imageUrl: initialData?.imageUrl || '',
      imagePublicId: initialData?.imagePublicId || '',
    },
  });

  const handleImageChange = (url: string, publicId: string) => {
    setValue('imageUrl', url);
    setValue('imagePublicId', publicId);
  };

  const handleImageRemove = () => {
    setValue('imageUrl', '');
    setValue('imagePublicId', '');
  };

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data))} className="space-y-6">
      {/* Image Upload */}
      <div>
        <Label>Product Image</Label>
        <div className="mt-2">
          <ImageUpload
            value={initialData?.imageUrl}
            onChange={handleImageChange}
            onRemove={handleImageRemove}
            priority={imagePriority}
          />
        </div>
      </div>

      {/* Name */}
      <div>
        <Label htmlFor="name">
          Product Name <span className="text-destructive">*</span>
        </Label>
        <Input
          {...register('name')}
          id="name"
          placeholder="Enter product name"
          className="mt-2"
        />
        {errors.name && (
          <p className="text-destructive text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      {/* Barcode */}
      <div>
        <Label htmlFor="barcode">
          Barcode <span className="text-destructive">*</span>
        </Label>
        <Input
          {...register('barcode')}
          id="barcode"
          placeholder="Enter barcode (e.g., 1234567890123)"
          className="mt-2"
        />
        {errors.barcode && (
          <p className="text-destructive text-sm mt-1">{errors.barcode.message}</p>
        )}
      </div>

      {/* Price and Stock Quantity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">
            Price ($) <span className="text-destructive">*</span>
          </Label>
          <Input
            {...register('price', { valueAsNumber: true })}
            id="price"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className="mt-2"
          />
          {errors.price && (
            <p className="text-destructive text-sm mt-1">{errors.price.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="stockQuantity">Stock Quantity</Label>
          <Input
            {...register('stockQuantity', { valueAsNumber: true })}
            id="stockQuantity"
            type="number"
            min="0"
            placeholder="0"
            className="mt-2"
          />
          {errors.stockQuantity && (
            <p className="text-destructive text-sm mt-1">{errors.stockQuantity.message}</p>
          )}
        </div>
      </div>

      {/* Category */}
      <div>
        <Label htmlFor="category">Category</Label>
        <Input
          {...register('category')}
          id="category"
          placeholder="e.g., Beverages, Snacks, Dairy"
          list="categories"
          className="mt-2"
        />
        <datalist id="categories">
          <option value="Beverages" />
          <option value="Snacks" />
          <option value="Dairy" />
          <option value="Bakery" />
          <option value="Frozen" />
          <option value="Canned Goods" />
          <option value="Personal Care" />
          <option value="Household" />
        </datalist>
        {errors.category && (
          <p className="text-destructive text-sm mt-1">{errors.category.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          {...register('description')}
          id="description"
          rows={3}
          placeholder="Enter product description"
          className="mt-2"
        />
        {errors.description && (
          <p className="text-destructive text-sm mt-1">{errors.description.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-4">
        {!hideCancelButton && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel || (() => window.history.back())}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving…
            </>
          ) : submitLabel}
        </Button>
      </div>
    </form>
  );
}
