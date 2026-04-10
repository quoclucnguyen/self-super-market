'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  productSchema,
  type ProductCodeInput,
  type ProductImageInput,
  type ProductInput,
  type ProductParsed,
  type ProductRawInput,
} from '@/lib/validations/product';
import { ProductImagesUpload } from './ProductImagesUpload';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface ProductFormProps {
  initialData?: Partial<ProductParsed>;
  onSubmit: (data: ProductInput) => Promise<void>;
  submitLabel?: string;
  isSubmitting?: boolean;
  imagePriority?: boolean;
  hideCancelButton?: boolean;
  onCancel?: () => void;
}

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'details', label: 'Details' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'instructions', label: 'Instructions' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export function ProductForm({
  initialData,
  onSubmit,
  submitLabel = 'Save Product',
  isSubmitting = false,
  imagePriority,
  hideCancelButton = false,
  onCancel,
}: ProductFormProps) {
  void imagePriority;

  const [activeTab, setActiveTab] = useState<TabId>('general');

  const initialImages =
    initialData?.images && initialData.images.length > 0
      ? initialData.images
      : initialData?.imageUrl && initialData?.imagePublicId
        ? [
            {
              imageUrl: initialData.imageUrl,
              imagePublicId: initialData.imagePublicId,
              isPrimary: true,
              order: 0,
            },
          ]
        : [];

  const initialCodes = initialData?.codes ?? [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductRawInput, unknown, ProductParsed>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || '',
      price: initialData?.price ?? undefined,
      unit: initialData?.unit || 'Cái',
      weightVolume: initialData?.weightVolume || '',
      categoryName: initialData?.categoryName || initialData?.category || '',
      brandName: initialData?.brandName || '',
      origin: initialData?.origin || '',
      ingredients: initialData?.ingredients || '',
      nutritionalInfo: initialData?.nutritionalInfo || '',
      usageInstructions: initialData?.usageInstructions || '',
      storageInstructions: initialData?.storageInstructions || '',
      shelfLifeDays: initialData?.shelfLifeDays || undefined,
      description: initialData?.description || '',
      category: initialData?.category || '',
      stockQuantity: initialData?.stockQuantity || 0,
      imageUrl: initialData?.imageUrl || '',
      imagePublicId: initialData?.imagePublicId || '',
      images: initialImages,
      codes: initialCodes,
      isActive: initialData?.isActive ?? true,
    },
  });

  const images = (watch('images') || []) as ProductImageInput[];
  const codes = (watch('codes') || []) as ProductCodeInput[];

  const handleAddCode = () => {
    const newCodes = [
      ...codes,
      {
        code: '',
        codeType: 'barcode' as const,
        isPrimary: codes.length === 0,
        isActive: true,
        order: codes.length,
      },
    ];
    setValue('codes', newCodes, { shouldDirty: true, shouldValidate: true });
  };

  const handleRemoveCode = (index: number) => {
    const newCodes = codes.filter((_, i) => i !== index);
    if (codes[index]?.isPrimary && newCodes.length > 0) {
      newCodes[0] = { ...newCodes[0], isPrimary: true };
    }
    setValue('codes', newCodes, { shouldDirty: true, shouldValidate: true });
  };

  const handleCodeChange = (index: number, field: keyof ProductCodeInput, value: unknown) => {
    const newCodes = codes.map((code, i) => {
      if (i === index) {
        return { ...code, [field]: value };
      }
      if (field === 'isPrimary' && value === true) {
        return { ...code, isPrimary: false };
      }
      return code;
    });
    setValue('codes', newCodes, { shouldDirty: true, shouldValidate: true });
  };

  const handleImagesChange = (nextImages: ProductImageInput[]) => {
    setValue('images', nextImages, { shouldDirty: true, shouldValidate: true });

    const primary = nextImages.find((image) => image.isPrimary) || nextImages[0];
    setValue('imageUrl', primary?.imageUrl || '', { shouldDirty: true });
    setValue('imagePublicId', primary?.imagePublicId || '', { shouldDirty: true });
  };

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data))}>
      {/* ── Tab Control ── */}
      <div className="wf-tabs">
        <ul className="wf-tab-list" role="tablist">
          {TABS.map((tab) => (
            <li
              key={tab.id}
              className="wf-tab-item"
              data-state={activeTab === tab.id ? 'active' : 'inactive'}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </li>
          ))}
        </ul>

        <div className="wf-tab-content" role="tabpanel">
          {/* ── General Tab ── */}
          {activeTab === 'general' && (
            <div className="space-y-3">
              {/* Product Codes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="wf-label font-semibold">Product Codes</span>
                  <button
                    type="button"
                    onClick={handleAddCode}
                    className="wf-button wf-focus-visible inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Code
                  </button>
                </div>

                <p className="wf-text-muted text-[11px] mb-2">
                  Add barcodes and SKU codes for this product
                </p>

                {codes.length === 0 && (
                  <p className="wf-text-muted text-[11px] italic">
                    No codes added yet. Click &quot;Add Code&quot; to begin.
                  </p>
                )}

                <div className="space-y-1">
                  {codes.map((code, index) => (
                    <div
                      key={index}
                      className="wf-datagrid-row flex items-center gap-1 px-1 py-1"
                    >
                      <input
                        type="text"
                        value={code.code}
                        onChange={(e) => handleCodeChange(index, 'code', e.target.value)}
                        placeholder={code.codeType === 'barcode' ? 'Barcode...' : 'SKU...'}
                        className="wf-input flex-1"
                        autoComplete="off"
                      />
                      <select
                        value={code.codeType}
                        onChange={(e) => handleCodeChange(index, 'codeType', e.target.value)}
                        className="wf-select"
                        style={{ minWidth: 80 }}
                      >
                        <option value="barcode">Barcode</option>
                        <option value="sku">SKU</option>
                      </select>
                      <label className="inline-flex items-center gap-1 wf-label cursor-pointer shrink-0">
                        <input
                          type="radio"
                          checked={code.isPrimary}
                          onChange={() => handleCodeChange(index, 'isPrimary', true)}
                          className="wf-radio"
                          name="primary-code"
                        />
                        Pri.
                      </label>
                      <label className="inline-flex items-center gap-1 wf-label cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={code.isActive}
                          onChange={(e) => handleCodeChange(index, 'isActive', e.target.checked)}
                          className="wf-checkbox"
                        />
                        Act.
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveCode(index)}
                        disabled={codes.length <= 1}
                        className="wf-button wf-focus-visible disabled:wf-disabled"
                        style={{ padding: '2px 4px', minHeight: 21 }}
                        aria-label={`Remove code ${index + 1}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {errors.codes && (
                  <p className="text-red-700 text-[11px] mt-1" role="alert">
                    {errors.codes.message}
                  </p>
                )}
              </div>

              {/* Product Images */}
              <div>
                <span className="wf-label font-semibold">Product Images</span>
                <div className="mt-1">
                  <ProductImagesUpload value={images} onChange={handleImagesChange} />
                </div>
                {errors.images && (
                  <p className="text-red-700 text-[11px] mt-1">{errors.images.message}</p>
                )}
              </div>

              {/* Product Name */}
              <div>
                <label htmlFor="name" className="wf-label wf-label-required">
                  Product Name
                </label>
                <input
                  {...register('name')}
                  id="name"
                  placeholder="Enter product name"
                  className="wf-input w-full mt-1"
                />
                {errors.name && (
                  <p className="text-red-700 text-[11px] mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* Price / Unit / Stock */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="price" className="wf-label">Price (VND)</label>
                  <input
                    {...register('price', { valueAsNumber: true })}
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="wf-input w-full mt-1"
                  />
                  {errors.price && (
                    <p className="text-red-700 text-[11px] mt-1">{errors.price.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="unit" className="wf-label wf-label-required">Unit</label>
                  <input
                    {...register('unit')}
                    id="unit"
                    placeholder="VD: Lon, Chai"
                    className="wf-input w-full mt-1"
                  />
                  {errors.unit && (
                    <p className="text-red-700 text-[11px] mt-1">{errors.unit.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="stockQuantity" className="wf-label">Stock</label>
                  <input
                    {...register('stockQuantity', { valueAsNumber: true })}
                    id="stockQuantity"
                    type="number"
                    min="0"
                    placeholder="0"
                    className="wf-input w-full mt-1"
                  />
                  {errors.stockQuantity && (
                    <p className="text-red-700 text-[11px] mt-1">{errors.stockQuantity.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Details Tab ── */}
          {activeTab === 'details' && (
            <div className="space-y-3">
              {/* Category / Brand */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="categoryName" className="wf-label">Category</label>
                  <input
                    {...register('categoryName')}
                    id="categoryName"
                    placeholder="VD: Đồ uống"
                    className="wf-input w-full mt-1"
                  />
                  {errors.categoryName && (
                    <p className="text-red-700 text-[11px] mt-1">{errors.categoryName.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="brandName" className="wf-label">Brand</label>
                  <input
                    {...register('brandName')}
                    id="brandName"
                    placeholder="VD: Coca-Cola"
                    className="wf-input w-full mt-1"
                  />
                  {errors.brandName && (
                    <p className="text-red-700 text-[11px] mt-1">{errors.brandName.message}</p>
                  )}
                </div>
              </div>

              {/* Weight / Origin */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="weightVolume" className="wf-label">Weight / Volume</label>
                  <input
                    {...register('weightVolume')}
                    id="weightVolume"
                    placeholder="VD: 330ml, 1.5kg"
                    className="wf-input w-full mt-1"
                  />
                  {errors.weightVolume && (
                    <p className="text-red-700 text-[11px] mt-1">{errors.weightVolume.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="origin" className="wf-label">Origin</label>
                  <input
                    {...register('origin')}
                    id="origin"
                    placeholder="VD: Việt Nam"
                    className="wf-input w-full mt-1"
                  />
                  {errors.origin && (
                    <p className="text-red-700 text-[11px] mt-1">{errors.origin.message}</p>
                  )}
                </div>
              </div>

              {/* Shelf Life */}
              <div>
                <label htmlFor="shelfLifeDays" className="wf-label">Shelf Life (days)</label>
                <input
                  {...register('shelfLifeDays', { valueAsNumber: true })}
                  id="shelfLifeDays"
                  type="number"
                  min="0"
                  placeholder="VD: 365"
                  className="wf-input w-full mt-1"
                />
                {errors.shelfLifeDays && (
                  <p className="text-red-700 text-[11px] mt-1">{errors.shelfLifeDays.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="wf-label">Description</label>
                <textarea
                  {...register('description')}
                  id="description"
                  rows={4}
                  placeholder="Enter product description"
                  className="wf-textarea w-full mt-1"
                />
                {errors.description && (
                  <p className="text-red-700 text-[11px] mt-1">{errors.description.message}</p>
                )}
              </div>
            </div>
          )}

          {/* ── Nutrition Tab ── */}
          {activeTab === 'nutrition' && (
            <div className="space-y-3">
              <div>
                <label htmlFor="ingredients" className="wf-label">Ingredients</label>
                <textarea
                  {...register('ingredients')}
                  id="ingredients"
                  rows={6}
                  placeholder="Thành phần sản phẩm"
                  className="wf-textarea w-full mt-1"
                />
                {errors.ingredients && (
                  <p className="text-red-700 text-[11px] mt-1">{errors.ingredients.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="nutritionalInfo" className="wf-label">Nutritional Info</label>
                <textarea
                  {...register('nutritionalInfo')}
                  id="nutritionalInfo"
                  rows={6}
                  placeholder="Thông tin dinh dưỡng"
                  className="wf-textarea w-full mt-1"
                />
                {errors.nutritionalInfo && (
                  <p className="text-red-700 text-[11px] mt-1">{errors.nutritionalInfo.message}</p>
                )}
              </div>
            </div>
          )}

          {/* ── Instructions Tab ── */}
          {activeTab === 'instructions' && (
            <div className="space-y-3">
              <div>
                <label htmlFor="usageInstructions" className="wf-label">Usage Instructions</label>
                <textarea
                  {...register('usageInstructions')}
                  id="usageInstructions"
                  rows={6}
                  placeholder="Hướng dẫn sử dụng"
                  className="wf-textarea w-full mt-1"
                />
                {errors.usageInstructions && (
                  <p className="text-red-700 text-[11px] mt-1">{errors.usageInstructions.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="storageInstructions" className="wf-label">Storage Instructions</label>
                <textarea
                  {...register('storageInstructions')}
                  id="storageInstructions"
                  rows={6}
                  placeholder="Hướng dẫn bảo quản"
                  className="wf-textarea w-full mt-1"
                />
                {errors.storageInstructions && (
                  <p className="text-red-700 text-[11px] mt-1">{errors.storageInstructions.message}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden Fields */}
      <div className="hidden" aria-hidden="true">
        <input {...register('category')} />
        <input {...register('imageUrl')} />
        <input {...register('imagePublicId')} />
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-gray-300">
        {!hideCancelButton && (
          <button
            type="button"
            onClick={onCancel || (() => window.history.back())}
            disabled={isSubmitting}
            className="wf-button wf-focus-visible disabled:wf-disabled"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="wf-button wf-button-primary wf-focus-visible disabled:wf-disabled inline-flex items-center gap-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
}
