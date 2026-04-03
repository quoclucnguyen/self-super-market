import { ProductForm } from '@/components/admin/ProductForm';
import { db } from '@/lib/db';
import { products } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { redirect, notFound } from 'next/navigation';
import type { ProductInput } from '@/lib/validations/product';

async function getProduct(id: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, parseInt(id)))
    .limit(1);

  return product;
}

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await getProduct(params.id);

  if (!product) {
    notFound();
  }

  async function updateProduct(data: ProductInput) {
    'use server';

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/products/${params.id}`,
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Edit Product
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Update product information
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <ProductForm
          initialData={{
            name: product.name,
            barcode: product.barcode,
            price: parseFloat(product.price),
            description: product.description || undefined,
            category: product.category || undefined,
            stockQuantity: product.stockQuantity,
            imageUrl: product.imageUrl || undefined,
            imagePublicId: product.imagePublicId || undefined,
          }}
          onSubmit={updateProduct}
          submitLabel="Update Product"
        />
      </div>
    </div>
  );
}
