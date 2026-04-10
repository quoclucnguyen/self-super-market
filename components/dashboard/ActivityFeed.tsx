import { ActivityLog } from '@/drizzle/schema';
import {
  PackagePlus,
  Edit,
  Trash2,
  Upload,
  Tag,
  Badge,
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
  brand_created: Badge,
};

const activityBadges = {
  product_created: 'wf-badge wf-badge-success',
  product_updated: 'wf-badge wf-badge-info',
  product_deleted: 'wf-badge wf-badge-error',
  product_imported: 'wf-badge wf-badge-info',
  category_created: 'wf-badge wf-badge-info',
  brand_created: 'wf-badge wf-badge-info',
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
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
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
  const badgeClass = activityBadges[activity.activityType] || activityBadges.product_updated;
  const label = activityLabels[activity.activityType] || activity.activityType;
  const timeAgo = formatRelativeTime(new Date(activity.createdAt));
  const changesPreview = parseChanges(activity.changes);

  return (
    <div className="flex items-start gap-2 py-2 px-2 wf-list-item">
      <div className={`wf-panel shrink-0 flex items-center justify-center w-6 h-6`}>
        <Icon className="w-3 h-3" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs wf-text">
          <span className="font-semibold">
            {activity.userName || 'User'}
          </span>{' '}
          {label}
          {activity.entityType === 'product' && (
            <>
              {' '}#{activity.entityId}
            </>
          )}
        </p>
        {changesPreview && (
          <p className="text-[10px] wf-text-muted mt-0.5 line-clamp-1">
            {changesPreview}
          </p>
        )}
        <p className="text-[10px] wf-text-muted mt-0.5 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
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
      <div className="wf-panel">
        <div className="text-center py-8 px-3">
          <svg className="mx-auto h-10 w-10 wf-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 wf-label font-semibold">No recent activity</h3>
          <p className="mt-1 text-xs wf-text-muted">
            Activity will appear here as you use the system.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="wf-panel">
      <div className="wf-menubar px-3 py-2">
        <h3 className="wf-label font-semibold flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Recent Activity
        </h3>
      </div>

      <div className="divide-y divide-gray-300 wf-scroll" style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {displayActivities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}
