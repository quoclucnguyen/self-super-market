import Link from 'next/link';
import { AlertTriangle, Package } from 'lucide-react';
import Image from 'next/image';

interface LowStockAlert {
  productId: number;
  productName: string;
  stockQuantity: number;
  imageUrl?: string | null;
}

interface LowStockAlertsProps {
  alerts: LowStockAlert[];
  threshold?: number;
  maxDisplay?: number;
}

function getStockColor(quantity: number) {
  if (quantity <= 5) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50';
  if (quantity <= 10) return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50';
  return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/50';
}

function getStockLabel(quantity: number) {
  if (quantity <= 5) return 'Critical';
  if (quantity <= 10) return 'Low';
  return 'Warning';
}

export function LowStockAlerts({ alerts, threshold = 20, maxDisplay = 5 }: LowStockAlertsProps) {
  const sortedAlerts = [...alerts].sort((a, b) => a.stockQuantity - b.stockQuantity);
  const displayAlerts = sortedAlerts.slice(0, maxDisplay);

  if (displayAlerts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 text-gray-400">
          <Package className="w-5 h-5" />
          <p className="text-sm">All products are in stock.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Low Stock Alerts
          </h3>
          {sortedAlerts.length > maxDisplay && (
            <Link
              href="/admin?lowStock=true"
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all ({sortedAlerts.length})
            </Link>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {displayAlerts.map((alert) => (
          <Link
            key={alert.productId}
            href={`/admin/products/${alert.productId}`}
            className="block p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-start gap-3">
              {alert.imageUrl && (
                <div className="flex-shrink-0 w-12 h-12 rounded bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <Image
                    src={alert.imageUrl}
                    alt={alert.productName}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {alert.productName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStockColor(
                      alert.stockQuantity
                    )}`}
                  >
                    {alert.stockQuantity} left
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {getStockLabel(alert.stockQuantity)}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
