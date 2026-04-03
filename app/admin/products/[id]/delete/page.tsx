import { db } from '@/lib/db';
import { products } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import Image from 'next/image';

async function getProduct(id: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, parseInt(id)))
    .limit(1);

  return product;
}

export default async function DeleteProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await getProduct(params.id);

  if (!product) {
    notFound();
  }

  async function deleteProduct() {
    'use server';

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/products/${params.id}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete product');
    }

    redirect('/admin');
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-start gap-4">
          {product.imageUrl && (
            <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Delete Product
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Name</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{product.name}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Barcode</dt>
              <dd className="font-mono text-gray-900 dark:text-gray-100">{product.barcode}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Price</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                ${parseFloat(product.price).toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Stock</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {product.stockQuantity} units
              </dd>
            </div>
            {product.category && (
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Category</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{product.category}</dd>
              </div>
            )}
          </dl>
        </div>

        <form action={deleteProduct} className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Delete Product
          </button>
        </form>
      </div>
    </div>
  );
}
