'use client';

import { X, Loader2 } from 'lucide-react';
import { ProductForm } from './ProductForm';
import type { ProductInput } from '@/lib/validations/product';

interface ProductModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: Partial<ProductInput>;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: ProductInput) => Promise<void>;
}

export function ProductModal({
  isOpen,
  mode,
  initialData,
  isSubmitting,
  onClose,
  onSubmit,
}: ProductModalProps) {
  if (!isOpen) return null;

  const title = mode === 'create' ? 'Add New Product' : 'Edit Product';
  const submitLabel = mode === 'create' ? 'Create Product' : 'Update Product';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="modal-title"
            className="text-xl font-semibold text-gray-900 dark:text-gray-100"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6">
          <ProductForm
            initialData={initialData}
            onSubmit={onSubmit}
            submitLabel={submitLabel}
            isSubmitting={isSubmitting}
            imagePriority={false}
            hideCancelButton
          />
        </div>
      </div>
    </div>
  );
}
