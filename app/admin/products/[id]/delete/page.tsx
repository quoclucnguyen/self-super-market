import { getDetailedProductById } from '@/app/api/products/helpers';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

async function getProduct(id: string) {
  const productId = Number.parseInt(id, 10);
  if (Number.isNaN(productId)) return null;
  return getDetailedProductById(productId);
}

export default async function DeleteProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  const activeCodes = product.codes.filter((code) => code.isActive);
  const barcode =
    activeCodes.find((code) => code.codeType === 'barcode' && code.isPrimary)?.code
    ?? activeCodes.find((code) => code.codeType === 'barcode')?.code
    ?? activeCodes.find((code) => code.isPrimary)?.code
    ?? activeCodes[0]?.code
    ?? 'N/A';

  async function deleteProduct() {
    'use server';

    const { id: productId } = await params;
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/products/${productId}`,
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
    <div className="max-w-lg mx-auto py-8">
      {/* Back Navigation */}
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors touch-action-manipulation"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Back to Products
      </Link>

      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <div className="flex items-start gap-4">
          {product.imageUrl && (
            <div className="shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-muted">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">
              Delete Product
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium text-foreground truncate" title={product.name}>
                {product.name}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Barcode</dt>
              <dd className="font-mono text-foreground truncate" title={barcode}>
                {barcode}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Price</dt>
              <dd className="font-medium text-foreground tabular-nums">
                ${parseFloat(product.price).toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Stock</dt>
              <dd className="font-medium text-foreground tabular-nums">
                {product.stockQuantity} units
              </dd>
            </div>
            {product.category && (
              <div className="col-span-2">
                <dt className="text-muted-foreground">Category</dt>
                <dd className="font-medium text-foreground truncate" title={product.category}>
                  {product.category}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <form action={deleteProduct} className="mt-6 flex justify-end gap-3" method="post">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background touch-action-manipulation min-h-[44px]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            Delete Product
          </button>
        </form>
      </div>
    </div>
  );
}
