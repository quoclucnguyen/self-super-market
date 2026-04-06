'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  productSchema,
  type ProductImageInput,
  type ProductInput,
  type ProductParsed,
  type ProductRawInput,
} from '@/lib/validations/product';
import { ProductImagesUpload } from './ProductImagesUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface ProductFormProps {
  initialData?: Partial<ProductParsed>;
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
  void imagePriority;

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
      barcode: initialData?.barcode || '',
      sku: initialData?.sku || '',
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
      isActive: initialData?.isActive ?? true,
    },
  });

  const images = (watch('images') || []) as ProductImageInput[];

  const handleImagesChange = (nextImages: ProductImageInput[]) => {
    setValue('images', nextImages, { shouldDirty: true, shouldValidate: true });

    const primary = nextImages.find((image) => image.isPrimary) || nextImages[0];
    setValue('imageUrl', primary?.imageUrl || '', { shouldDirty: true });
    setValue('imagePublicId', primary?.imagePublicId || '', { shouldDirty: true });
  };

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data))} className="space-y-6">
      {/* Image Upload */}
      <div>
        <Label>Product Images</Label>
        <div className="mt-2">
          <ProductImagesUpload value={images} onChange={handleImagesChange} />
        </div>
        {errors.images && (
          <p className="text-destructive text-sm mt-1">{errors.images.message}</p>
        )}
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

      {/* SKU */}
      <div>
        <Label htmlFor="sku">SKU</Label>
        <Input
          {...register('sku')}
          id="sku"
          placeholder="VD: BEV-COCA-330"
          className="mt-2"
        />
        {errors.sku && <p className="text-destructive text-sm mt-1">{errors.sku.message}</p>}
      </div>

      {/* Price and Stock Quantity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="price">Price (VND)</Label>
          <Input
            {...register('price', { valueAsNumber: true })}
            id="price"
            type="number"
            step="0.01"
            min="0"
            placeholder="Để trống nếu chưa có giá"
            className="mt-2"
          />
          {errors.price && (
            <p className="text-destructive text-sm mt-1">{errors.price.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="unit">
            Unit <span className="text-destructive">*</span>
          </Label>
          <Input
            {...register('unit')}
            id="unit"
            placeholder="VD: Lon, Chai, Kg"
            className="mt-2"
          />
          {errors.unit && <p className="text-destructive text-sm mt-1">{errors.unit.message}</p>}
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

      {/* Category & Brand */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="categoryName">Category</Label>
          <Input
            {...register('categoryName')}
            id="categoryName"
            placeholder="VD: Đồ uống"
            className="mt-2"
          />
          {errors.categoryName && (
            <p className="text-destructive text-sm mt-1">{errors.categoryName.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="brandName">Brand</Label>
          <Input
            {...register('brandName')}
            id="brandName"
            placeholder="VD: Coca-Cola"
            className="mt-2"
          />
          {errors.brandName && (
            <p className="text-destructive text-sm mt-1">{errors.brandName.message}</p>
          )}
        </div>
      </div>

      {/* Product details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="weightVolume">Weight/Volume</Label>
          <Input
            {...register('weightVolume')}
            id="weightVolume"
            placeholder="VD: 330ml, 1.5kg"
            className="mt-2"
          />
          {errors.weightVolume && (
            <p className="text-destructive text-sm mt-1">{errors.weightVolume.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="origin">Origin</Label>
          <Input
            {...register('origin')}
            id="origin"
            placeholder="VD: Việt Nam"
            className="mt-2"
          />
          {errors.origin && (
            <p className="text-destructive text-sm mt-1">{errors.origin.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="shelfLifeDays">Shelf life (days)</Label>
          <Input
            {...register('shelfLifeDays', { valueAsNumber: true })}
            id="shelfLifeDays"
            type="number"
            min="0"
            placeholder="VD: 365"
            className="mt-2"
          />
          {errors.shelfLifeDays && (
            <p className="text-destructive text-sm mt-1">{errors.shelfLifeDays.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="ingredients">Ingredients</Label>
        <Textarea
          {...register('ingredients')}
          id="ingredients"
          rows={3}
          placeholder="Thành phần sản phẩm"
          className="mt-2"
        />
        {errors.ingredients && (
          <p className="text-destructive text-sm mt-1">{errors.ingredients.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="nutritionalInfo">Nutritional info</Label>
        <Textarea
          {...register('nutritionalInfo')}
          id="nutritionalInfo"
          rows={3}
          placeholder="Thông tin dinh dưỡng"
          className="mt-2"
        />
        {errors.nutritionalInfo && (
          <p className="text-destructive text-sm mt-1">{errors.nutritionalInfo.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="usageInstructions">Usage instructions</Label>
        <Textarea
          {...register('usageInstructions')}
          id="usageInstructions"
          rows={3}
          placeholder="Hướng dẫn sử dụng"
          className="mt-2"
        />
        {errors.usageInstructions && (
          <p className="text-destructive text-sm mt-1">{errors.usageInstructions.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="storageInstructions">Storage instructions</Label>
        <Textarea
          {...register('storageInstructions')}
          id="storageInstructions"
          rows={3}
          placeholder="Hướng dẫn bảo quản"
          className="mt-2"
        />
        {errors.storageInstructions && (
          <p className="text-destructive text-sm mt-1">{errors.storageInstructions.message}</p>
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

      <div className="hidden">
        <Input {...register('category')} />
        <Input {...register('imageUrl')} />
        <Input {...register('imagePublicId')} />
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
