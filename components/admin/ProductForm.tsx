'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductInput } from '@/lib/validations/product';
import { ImageUpload } from './ImageUpload';

interface ProductFormProps {
  initialData?: Partial<ProductInput>;
  onSubmit: (data: ProductInput) => Promise<void>;
  submitLabel?: string;
  isSubmitting?: boolean;
  imagePriority?: boolean;
}

export function ProductForm({
  initialData,
  onSubmit,
  submitLabel = 'Save Product',
  isSubmitting = false,
  imagePriority,
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Product Image
        </label>
        <ImageUpload
          value={initialData?.imageUrl}
          onChange={handleImageChange}
          onRemove={handleImageRemove}
          priority={imagePriority}
        />
      </div>

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Product Name <span className="text-red-500">*</span>
        </label>
        <input
          {...register('name')}
          type="text"
          id="name"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600"
          placeholder="Enter product name"
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      {/* Barcode */}
      <div>
        <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Barcode <span className="text-red-500">*</span>
        </label>
        <input
          {...register('barcode')}
          type="text"
          id="barcode"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600"
          placeholder="Enter barcode (e.g., 1234567890123)"
        />
        {errors.barcode && (
          <p className="text-red-500 text-sm mt-1">{errors.barcode.message}</p>
        )}
      </div>

      {/* Price and Stock Quantity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Price ($) <span className="text-red-500">*</span>
          </label>
          <input
            {...register('price', { valueAsNumber: true })}
            type="number"
            id="price"
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600"
            placeholder="0.00"
          />
          {errors.price && (
            <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="stockQuantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Stock Quantity
          </label>
          <input
            {...register('stockQuantity', { valueAsNumber: true })}
            type="number"
            id="stockQuantity"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600"
            placeholder="0"
          />
          {errors.stockQuantity && (
            <p className="text-red-500 text-sm mt-1">{errors.stockQuantity.message}</p>
          )}
        </div>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Category
        </label>
        <input
          {...register('category')}
          type="text"
          id="category"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600"
          placeholder="e.g., Beverages, Snacks, Dairy"
          list="categories"
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
          <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          {...register('description')}
          id="description"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600"
          placeholder="Enter product description"
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
