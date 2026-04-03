'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Edit, Trash2, MoreVertical } from 'lucide-react';
import type { Product } from '@/drizzle/schema';

interface ProductListClientProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function ProductListClient({ products, onEdit, onDelete }: ProductListClientProps) {
  const [activeMenu, setActiveMenu] = useState<number | null>(null);

  const getStockBadgeClass = (quantity: number) => {
    if (quantity > 10) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800';
    }
    if (quantity > 0) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800';
    }
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800';
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">No products found</h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your search or add a new product.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Barcode
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((product) => (
              <tr
                key={product.id}
                className="hover:bg-accent transition-colors cursor-pointer group"
                onClick={() => onEdit(product)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    {product.imageUrl ? (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {product.name}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <code className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                    {product.barcode}
                  </code>
                </td>
                <td className="px-6 py-4">
                  {product.category ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-muted text-foreground">
                      {product.category}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="font-semibold text-foreground">
                    ${parseFloat(product.price).toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${getStockBadgeClass(product.stockQuantity)}`}>
                    {product.stockQuantity} units
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(product);
                      }}
                      className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors min-h-9 min-w-9 focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Edit ${product.name}`}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(product);
                      }}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors min-h-9 min-w-9 focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Delete ${product.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-card rounded-xl border border-border p-4"
          >
            <div className="flex gap-4">
              {product.imageUrl ? (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {product.name}
                </h3>
                <code className="text-xs font-mono text-muted-foreground">
                  {product.barcode}
                </code>
                <div className="flex items-center gap-3 mt-2">
                  <span className="font-bold text-foreground">
                    ${parseFloat(product.price).toFixed(2)}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${getStockBadgeClass(product.stockQuantity)}`}>
                    {product.stockQuantity}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => onEdit(product)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors min-h-11 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(product)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors min-h-11 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
