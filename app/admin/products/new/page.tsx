import { ProductForm } from '@/components/admin/ProductForm';
import { redirect } from 'next/navigation';
import type { ProductInput } from '@/lib/validations/product';

export default function NewProductPage() {
  async function createProduct(data: ProductInput) {
    'use server';

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create product');
    }

    redirect('/admin');
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Add New Product
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Create a new product for your inventory
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <ProductForm
          onSubmit={createProduct}
          submitLabel="Create Product"
        />
      </div>
    </div>
  );
}
