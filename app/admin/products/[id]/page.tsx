import { ProductForm } from '@/components/admin/ProductForm';
import { getDetailedProductById } from '@/app/api/products/helpers';
import { redirect, notFound } from 'next/navigation';
import type { ProductInput } from '@/lib/validations/product';

async function getProduct(id: string) {
  const productId = Number.parseInt(id, 10);
  if (Number.isNaN(productId)) return null;
  return getDetailedProductById(productId);
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  async function updateProduct(data: ProductInput) {
    'use server';

    const { id: productId } = await params;
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/products/${productId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update product');
    }

    redirect('/admin');
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Edit Product
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update product information
        </p>
      </div>

      <div className="bg-card rounded-lg shadow p-6">
        <ProductForm
          initialData={{
            name: product.name,
            price: parseFloat(product.price),
            unit: product.unit,
            weightVolume: product.weightVolume || undefined,
            categoryName: product.categoryName || product.category || undefined,
            brandName: product.brandName || undefined,
            origin: product.origin || undefined,
            ingredients: product.ingredients || undefined,
            nutritionalInfo: product.nutritionalInfo || undefined,
            usageInstructions: product.usageInstructions || undefined,
            storageInstructions: product.storageInstructions || undefined,
            shelfLifeDays: product.shelfLifeDays || undefined,
            description: product.description || undefined,
            category: product.category || undefined,
            stockQuantity: product.stockQuantity,
            imageUrl: product.imageUrl || undefined,
            imagePublicId: product.imagePublicId || undefined,
            images: product.images.map((image, index) => ({
              imageUrl: image.imageUrl,
              imagePublicId: image.imagePublicId,
              isPrimary: image.isPrimary,
              order: image.order ?? index,
            })),
            codes: product.codes.map((code, index) => ({
              id: code.id,
              code: code.code,
              codeType: code.codeType,
              isPrimary: code.isPrimary,
              isActive: code.isActive,
              order: code.order ?? index,
            })),
            isActive: product.isActive,
          }}
          onSubmit={updateProduct}
          submitLabel="Update Product"
          imagePriority={true}
        />
      </div>
    </div>
  );
}