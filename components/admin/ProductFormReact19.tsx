'use client';

import { useActionState } from 'react';
import { productSchema, type ProductInput } from '@/lib/validations/product';
import { ImageUpload } from './ImageUpload';

interface ProductFormReact19Props {
  initialData?: Partial<ProductInput>;
  submitAction: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  submitLabel?: string;
}

/**
 * React 19 Native Form Component
 * 
 * This component demonstrates React 19's new form handling capabilities:
 * - useActionState hook for automatic pending state and error handling
 * - Native HTML form submission with automatic serialization
 * - No need for React Hook Form for basic form scenarios
 * 
 * Benefits:
 * - Smaller bundle size (no React Hook Form dependency)
 * - Better performance (fewer re-renders)
 * - Simpler code for straightforward forms
 * 
 * Note: For complex validation scenarios, React Hook Form is still recommended.
 */
export function ProductFormReact19({
  initialData,
  submitAction,
  submitLabel = 'Save Product',
}: ProductFormReact19Props) {
  const [state, formAction, isPending] = useActionState(
    async (_: { error?: string; success?: boolean } | null, formData: FormData) => {
      const rawPrice = formData.get('price');
      const normalizedPrice = typeof rawPrice === 'string' ? rawPrice.trim() : '';

      // Client-side validation using Zod
      const data: ProductInput = {
        name: formData.get('name') as string,
        barcode: formData.get('barcode') as string,
        price: normalizedPrice ? parseFloat(normalizedPrice) : undefined,
        unit: (formData.get('unit') as string) || 'Cái',
        description: formData.get('description') as string || '',
        category: formData.get('category') as string || '',
        stockQuantity: parseInt(formData.get('stockQuantity') as string) || 0,
        imageUrl: formData.get('imageUrl') as string || '',
        imagePublicId: formData.get('imagePublicId') as string || '',
      };

      const result = productSchema.safeParse(data);
      
      if (!result.success) {
        // Return validation errors (first error per field)
        const firstError = Object.values(result.error.flatten().fieldErrors)[0]?.[0];
        return { error: firstError || 'Validation failed' };
      }

      // Call server action
      return submitAction(formData);
    },
    null
  );

  const handleImageChange = (url: string, publicId: string) => {
    // Update hidden fields when image is uploaded
    const imageUrlField = document.querySelector('input[name="imageUrl"]') as HTMLInputElement;
    const imagePublicIdField = document.querySelector('input[name="imagePublicId"]') as HTMLInputElement;
    
    if (imageUrlField) imageUrlField.value = url;
    if (imagePublicIdField) imagePublicIdField.value = publicId;
  };

  const handleImageRemove = () => {
    const imageUrlField = document.querySelector('input[name="imageUrl"]') as HTMLInputElement;
    const imagePublicIdField = document.querySelector('input[name="imagePublicId"]') as HTMLInputElement;
    
    if (imageUrlField) imageUrlField.value = '';
    if (imagePublicIdField) imagePublicIdField.value = '';
  };

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {state.error}
        </div>
      )}

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Product Image
        </label>
        <ImageUpload
          value={initialData?.imageUrl}
          onChange={handleImageChange}
          onRemove={handleImageRemove}
        />
        {/* Hidden fields for React 19 form submission */}
        <input type="hidden" name="imageUrl" value={initialData?.imageUrl || ''} />
        <input type="hidden" name="imagePublicId" value={initialData?.imagePublicId || ''} />
      </div>

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Product Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          defaultValue={initialData?.name || ''}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600"
          placeholder="Enter product name"
        />
      </div>

      {/* Barcode */}
      <div>
        <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Barcode <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="barcode"
          name="barcode"
          defaultValue={initialData?.barcode || ''}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600"
          placeholder="Enter barcode (e.g., 1234567890123)"
        />
      </div>

      {/* Price and Stock Quantity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Price ($)
          </label>
          <input
            type="number"
            id="price"
            name="price"
            step="0.01"
            min="0"
            defaultValue={typeof initialData?.price === 'number' ? initialData.price : undefined}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600"
            placeholder="Leave blank if unavailable"
          />
        </div>

        <div>
          <label htmlFor="unit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Unit <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="unit"
            name="unit"
            defaultValue={initialData?.unit || 'Cái'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600"
            placeholder="Cái"
          />
        </div>

        <div>
          <label htmlFor="stockQuantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Stock Quantity
          </label>
          <input
            type="number"
            id="stockQuantity"
            name="stockQuantity"
            min="0"
            defaultValue={typeof initialData?.stockQuantity === 'number' ? initialData.stockQuantity : 0}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600"
            placeholder="0"
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Category
        </label>
        <input
          type="text"
          id="category"
          name="category"
          defaultValue={initialData?.category || ''}
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
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initialData?.description || ''}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600"
          placeholder="Enter product description"
        />
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
          disabled={isPending}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}