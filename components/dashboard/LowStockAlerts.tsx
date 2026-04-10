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

function getStockBadge(quantity: number) {
  if (quantity <= 5) return 'wf-badge wf-badge-error';
  if (quantity <= 10) return 'wf-badge wf-badge-warning';
  return 'wf-badge wf-badge-error';
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
      <div className="wf-panel">
        <div className="flex items-center gap-2 p-3 wf-text-muted">
          <Package className="w-4 h-4" />
          <p className="text-xs">All products are in stock.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wf-panel">
      <div className="wf-menubar px-3 py-2 flex items-center justify-between">
        <h3 className="wf-label font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          Low Stock Alerts
        </h3>
        {sortedAlerts.length > maxDisplay && (
          <Link
            href="/admin?lowStock=true"
            className="text-xs wf-link"
          >
            View all ({sortedAlerts.length})
          </Link>
        )}
      </div>

      <div className="divide-y divide-gray-300">
        {displayAlerts.map((alert) => (
          <Link
            key={alert.productId}
            href={`/admin/products/${alert.productId}`}
            className="wf-list-item block"
          >
            <div className="flex items-start gap-2 px-2 py-2">
              {alert.imageUrl && (
                <div className="wf-panel flex-shrink-0 w-10 h-10 overflow-hidden">
                  <Image
                    src={alert.imageUrl}
                    alt={alert.productName}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="wf-label font-medium truncate">
                  {alert.productName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={getStockBadge(alert.stockQuantity)}>
                    {alert.stockQuantity} left
                  </span>
                  <span className="text-xs wf-text-muted">
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
