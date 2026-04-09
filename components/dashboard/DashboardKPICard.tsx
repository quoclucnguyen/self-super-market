import { LucideIcon } from 'lucide-react';

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
    bg: 'bg-blue-50 dark:bg-blue-950',
    text: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-950',
    text: 'text-green-600 dark:text-green-400',
    iconBg: 'bg-green-100 dark:bg-green-900',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950',
    text: 'text-orange-600 dark:text-orange-400',
    iconBg: 'bg-orange-100 dark:bg-orange-900',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950',
    text: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-100 dark:bg-red-900',
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
  const CardComponent = href ? 'a' : 'div';

  return (
    <CardComponent
      href={href}
      className={`${styles.bg} ${href ? 'hover:opacity-80 transition-opacity' : ''} rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
          <p className={`text-2xl sm:text-3xl font-bold ${styles.text} mt-2`}>
            {value}
          </p>
          {trend && trendValue && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-500">
                {trendIcons[trend]}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{trendValue}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`${styles.iconBg} p-3 rounded-lg`}>
            <Icon className={`w-6 h-6 ${styles.text}`} />
          </div>
        )}
      </div>
    </CardComponent>
  );
}
