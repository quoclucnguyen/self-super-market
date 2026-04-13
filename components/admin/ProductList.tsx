'use client';

import Link from 'next/link';
import type { ProductCode } from '@/drizzle/schema';
import { Tooltip } from '@/components/ui/tooltip';

interface ProductWithCodes {
  id: number;
  name: string;
  price: string;
  category: string | null;
  stockQuantity: number;
  imageUrl: string | null;
  codes: ProductCode[];
}

interface ProductListProps {
  products: ProductWithCodes[];
  currentPage?: number;
  totalPages?: number;
  searchParams: { search?: string; category?: string; page?: string };
}

export function ProductList({
  products,
  currentPage = 1,
  totalPages = 1,
  searchParams,
}: ProductListProps) {
  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    if (searchParams.search) params.set('search', searchParams.search);
    if (searchParams.category) params.set('category', searchParams.category);
    params.set('page', page.toString());
    return `/admin?${params.toString()}`;
  };
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No products</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Get started by creating a new product.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Products Table - Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Product
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Codes
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {product.imageUrl && (
                      <div className="shrink-0 h-10 w-10">
                        <img
                          className="h-10 w-10 rounded object-cover"
                          src={product.imageUrl}
                          alt={product.name}
                        />
                      </div>
                    )}
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {product.name}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {product.codes
                    .filter((c) => c.isActive)
                    .filter((c) => c.isPrimary || c.codeType === 'barcode')
                    .slice(0, 2)
                    .map((c) => (
                      <Tooltip
                        key={c.id}
                        content={
                          <div className="text-left">
                            <div className="font-semibold">{c.code}</div>
                            <div className="text-xs opacity-75">
                              {c.codeType} {c.isPrimary && '• Primary'}
                            </div>
                          </div>
                        }
                      >
                        <span className="inline-block mr-2 cursor-help border-b border-dashed border-gray-400 dark:border-gray-600">
                          {c.code}
                        </span>
                      </Tooltip>
                    ))}
                  {product.codes.filter((c) => c.isActive).length > 2 && (
                    <Tooltip
                      content={
                        <div className="text-left">
                          {product.codes
                            .filter((c) => c.isActive)
                            .slice(2)
                            .map((c) => (
                              <div key={c.id} className="text-xs">
                                {c.code} • {c.codeType} {c.isPrimary && '• Primary'}
                              </div>
                            ))}
                        </div>
                      }
                    >
                      <span className="text-gray-400 cursor-help border-b border-dashed border-gray-300 dark:border-gray-700">
                        +{product.codes.filter((c) => c.isActive).length - 2} more
                      </span>
                    </Tooltip>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {product.category || '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  ${parseFloat(product.price).toFixed(2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    product.stockQuantity > 10
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : product.stockQuantity > 0
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {product.stockQuantity} units
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/admin/products/${product.id}/delete`}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Delete
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Products Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {products.map((product) => (
          <div key={product.id} className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
            <div className="flex items-start gap-3">
              {product.imageUrl && (
                <img
                  className="h-16 w-16 rounded object-cover"
                  src={product.imageUrl}
                  alt={product.name}
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {product.name}
                </h3>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {product.codes
                    .filter((c) => c.isActive)
                    .filter((c) => c.isPrimary || c.codeType === 'barcode')
                    .slice(0, 2)
                    .map((c) => (
                      <Tooltip
                        key={c.id}
                        content={
                          <div className="text-left">
                            <div className="font-semibold">{c.code}</div>
                            <div className="text-xs opacity-75">
                              {c.codeType} {c.isPrimary && '• Primary'}
                            </div>
                          </div>
                        }
                      >
                        <span className="inline-block mr-1 cursor-help border-b border-dashed border-gray-400 dark:border-gray-600">
                          {c.code}
                        </span>
                      </Tooltip>
                    ))}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    ${parseFloat(product.price).toFixed(2)}
                  </span>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    product.stockQuantity > 10
                      ? 'bg-green-100 text-green-800'
                      : product.stockQuantity > 0
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.stockQuantity}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <Link
                href={`/admin/products/${product.id}`}
                className="text-sm text-blue-600 hover:text-blue-900 dark:text-blue-400"
              >
                Edit
              </Link>
              <Link
                href={`/admin/products/${product.id}/delete`}
                className="text-sm text-red-600 hover:text-red-900 dark:text-red-400"
              >
                Delete
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex-1 flex justify-between sm:hidden">
            {currentPage > 1 ? (
              <Link
                href={buildUrl(currentPage - 1)}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Previous
              </Link>
            ) : (
              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-400 bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-500 cursor-not-allowed">
                Previous
              </span>
            )}
            {currentPage < totalPages ? (
              <Link
                href={buildUrl(currentPage + 1)}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Next
              </Link>
            ) : (
              <span className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-400 bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-500 cursor-not-allowed">
                Next
              </span>
            )}
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Page <span className="font-medium">{currentPage}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {currentPage > 1 ? (
                  <Link
                    href={buildUrl(currentPage - 1)}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    Previous
                  </Link>
                ) : (
                  <span className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-gray-50 text-sm font-medium text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-500">
                    Previous
                  </span>
                )}
                {currentPage < totalPages ? (
                  <Link
                    href={buildUrl(currentPage + 1)}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    Next
                  </Link>
                ) : (
                  <span className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-gray-50 text-sm font-medium text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-500">
                    Next
                  </span>
                )}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
