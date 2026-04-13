import Link from 'next/link';
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

function getStockBadge(quantity: number) {
  if (quantity > 10) {
    return 'wf-badge wf-badge-success';
  }
  if (quantity > 0) {
    return 'wf-badge wf-badge-warning';
  }
  return 'wf-badge wf-badge-error';
}

export function DashboardProductTable({ products, maxDisplay = 5 }: DashboardProductTableProps) {
  const displayProducts = products.slice(0, maxDisplay);

  return (
    <div className="wf-panel">
      <div className="wf-menubar px-3 py-2 flex items-center justify-between">
        <h3 className="wf-label font-semibold">
          Recent Products
        </h3>
        {products.length > maxDisplay && (
          <Link
            href="/admin"
            className="text-xs wf-link"
          >
            View all ({products.length})
          </Link>
        )}
      </div>

      {/* Windows Form Data Grid */}
      <div className="wf-datagrid wf-scroll">
        <table className="w-full">
          <thead>
            <tr>
              <th className="wf-datagrid-header">Product</th>
              <th className="wf-datagrid-header">Codes</th>
              <th className="wf-datagrid-header">Category</th>
              <th className="wf-datagrid-header">Stock</th>
              <th className="wf-datagrid-header">Price</th>
            </tr>
          </thead>
          <tbody>
            {displayProducts.map((product) => (
              <tr key={product.id} className="wf-datagrid-row">
                <td className="wf-datagrid-cell">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="flex items-center gap-2 group wf-link"
                  >
                    {product.imageUrl && (
                      <div className="wf-panel w-8 h-8 shrink-0 overflow-hidden">
                        <img
                          className="w-full h-full object-cover"
                          src={product.imageUrl}
                          alt={product.name}
                        />
                      </div>
                    )}
                    <span className="wf-label font-medium group-hover:underline">
                      {product.name}
                    </span>
                  </Link>
                </td>
                <td className="wf-datagrid-cell font-mono text-xs wf-text-muted">
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
                    <span className="wf-text-muted">
                      +{product.codes.filter((c) => c.isActive).length - 2}
                    </span>
                  )}
                </td>
                <td className="wf-datagrid-cell wf-text-muted">
                  {product.category || '-'}
                </td>
                <td className="wf-datagrid-cell">
                  <span className={getStockBadge(product.stockQuantity)}>
                    {product.stockQuantity}
                  </span>
                </td>
                <td className="wf-datagrid-cell wf-text">
                  ${parseFloat(product.price).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
