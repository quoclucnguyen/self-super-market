import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface KPICardProps {
  value: string | number;
  label: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'orange' | 'red';
  href?: string;
}

const colorStyles = {
  blue: {
    text: 'text-blue-700',
    badge: 'wf-badge-info',
  },
  green: {
    text: 'text-green-700',
    badge: 'wf-badge-success',
  },
  orange: {
    text: 'text-orange-700',
    badge: 'wf-badge-warning',
  },
  red: {
    text: 'text-red-700',
    badge: 'wf-badge-error',
  },
};

const trendIcons = {
  up: '↑',
  down: '↓',
  neutral: '→',
};

export function DashboardKPICard({
  value,
  label,
  trend,
  trendValue,
  icon: Icon,
  color = 'blue',
  href,
}: KPICardProps) {
  const styles = colorStyles[color];

  const cardContent = (
    <div className={`wf-panel-white ${href ? 'hover:opacity-80 transition-opacity cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between p-3">
        <div className="flex-1">
          <p className="wf-label wf-text-muted">{label}</p>
          <p className={`text-2xl font-bold ${styles.text} mt-1`}>
            {value}
          </p>
          {trend && trendValue && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium wf-text-muted">
                {trendIcons[trend]}
              </span>
              <span className="text-xs wf-text-muted">{trendValue}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`wf-panel p-2`}>
            <Icon className={`w-5 h-5 ${styles.text}`} />
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{cardContent}</Link>;
  }

  return cardContent;
}
