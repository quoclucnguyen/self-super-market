import { ActivityLog } from '@/drizzle/schema';
import {
  PackagePlus,
  Edit,
  Trash2,
  Upload,
  Tag,
  Brand,
  Clock
} from 'lucide-react';

interface ActivityFeedProps {
  activities: ActivityLog[];
  maxDisplay?: number;
}

interface ActivityItemProps {
  activity: ActivityLog;
}

const activityIcons = {
  product_created: PackagePlus,
  product_updated: Edit,
  product_deleted: Trash2,
  product_imported: Upload,
  category_created: Tag,
  brand_created: Brand,
};

const activityColors = {
  product_created: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50',
  product_updated: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50',
  product_deleted: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50',
  product_imported: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50',
  category_created: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50',
  brand_created: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50',
};

const activityLabels = {
  product_created: 'created product',
  product_updated: 'updated product',
  product_deleted: 'deleted product',
  product_imported: 'imported products',
  category_created: 'created category',
  brand_created: 'created brand',
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function parseChanges(changes: string | null): string {
  if (!changes) return '';
  try {
    const parsed = JSON.parse(changes);
    if (typeof parsed === 'object' && parsed !== null) {
      const entries = Object.entries(parsed);
      if (entries.length === 0) return '';
      return entries.map(([key, value]) => `${key}: ${value}`).join(', ');
    }
    return changes;
  } catch {
    return changes || '';
  }
}

function ActivityItem({ activity }: ActivityItemProps) {
  const Icon = activityIcons[activity.activityType] || Edit;
  const colorClass = activityColors[activity.activityType] || activityColors.product_updated;
  const label = activityLabels[activity.activityType] || activity.activityType;
  const timeAgo = formatRelativeTime(new Date(activity.createdAt));
  const changesPreview = parseChanges(activity.changes);

  return (
    <div className="flex items-start gap-3 py-3">
      <div className={`flex-shrink-0 p-2 rounded-full ${colorClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-gray-100">
          <span className="font-medium">
            {activity.userName || 'User'}
          </span>{' '}
          {label}
          {activity.entityType === 'product' && (
            <>
              {' '}product ID #{activity.entityId}
            </>
          )}
        </p>
        {changesPreview && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
            {changesPreview}
          </p>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeAgo}
        </p>
      </div>
    </div>
  );
}

export function ActivityFeed({ activities, maxDisplay = 10 }: ActivityFeedProps) {
  const displayActivities = activities.slice(0, maxDisplay);

  if (displayActivities.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="text-center py-8">
          <ActivityLogIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No recent activity</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Activity will appear here as you use the system.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <ActivityLogIcon className="w-5 h-5" />
          Recent Activity
        </h3>
      </div>

      <div className="p-4 sm:p-6">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {displayActivities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Icon for empty state
function ActivityLogIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  );
}
