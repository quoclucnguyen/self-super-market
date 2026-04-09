import Link from 'next/link';
import Image from 'next/image';
import type { ProductCode } from '@/drizzle/schema';

interface DashboardProduct {
  id: number;
  name: string;
  codes: ProductCode[];
  category: string | null;
  stockQuantity: number;
  price: string;
  imageUrl?: string | null;
}

interface DashboardProductTableProps {
  products: DashboardProduct[];
  maxDisplay?: number;
}

function getStockBadgeColor(quantity: number) {
  if (quantity > 10) {
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  }
  if (quantity > 0) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  }
  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
}

export function DashboardProductTable({ products, maxDisplay = 5 }: DashboardProductTableProps) {
  const displayProducts = products.slice(0, maxDisplay);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Recent Products
          </h3>
          {products.length > maxDisplay && (
            <Link
              href="/admin"
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all ({products.length})
            </Link>
          )}
        </div>
      </div>

      {/* Desktop Table */}
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
                Stock
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Price
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {displayProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-4 whitespace-nowrap">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="flex items-center group"
                  >
                    {product.imageUrl && (
                      <div className="flex-shrink-0 h-10 w-10 mr-3">
                        <Image
                          className="h-10 w-10 rounded object-cover group-hover:opacity-80 transition-opacity"
                          src={product.imageUrl}
                          alt={product.name}
                          width={40}
                          height={40}
                        />
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {product.name}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {product.codes
                    .filter((c) => c.isActive)
                    .filter((c) => c.isPrimary || c.codeType === 'barcode')
                    .slice(0, 2)
                    .map((c) => (
                      <span key={c.id} className="inline-block mr-2">
                        {c.code}
                      </span>
                    ))}
                  {product.codes.filter((c) => c.isActive).length > 2 && (
                    <span className="text-gray-400 dark:text-gray-500">
                      +{product.codes.filter((c) => c.isActive).length - 2}
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {product.category || '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStockBadgeColor(
                      product.stockQuantity
                    )}`}
                  >
                    {product.stockQuantity} units
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  ${parseFloat(product.price).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
        {displayProducts.map((product) => (
          <Link
            key={product.id}
            href={`/admin/products/${product.id}`}
            className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-start gap-3">
              {product.imageUrl && (
                <Image
                  className="h-16 w-16 rounded object-cover"
                  src={product.imageUrl}
                  alt={product.name}
                  width={64}
                  height={64}
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {product.name}
                </h4>
                <div className="mt-1 space-y-1">
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {product.codes
                      .filter((c) => c.isActive)
                      .filter((c) => c.isPrimary || c.codeType === 'barcode')
                      .slice(0, 2)
                      .map((c) => (
                        <span key={c.id} className="inline-block mr-1">
                          {c.code}
                        </span>
                      ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      ${parseFloat(product.price).toFixed(2)}
                    </span>
                    <span
                      className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStockBadgeColor(
                        product.stockQuantity
                      )}`}
                    >
                      {product.stockQuantity}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
