import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { EmptyState, Icon, Loading } from '../components/ui';
import { getBackend } from '../lib/backend';
import { notificationLabel, relativeTime } from '../lib/format';
import type { AppNotification } from '../lib/types';
import { useAsync } from '../lib/useAsync';

const ICONS: Record<AppNotification['type'], string> = {
  booking: 'calendar',
  testimonial: 'heart',
  system: 'sparkle',
};

export default function Notifications() {
  const notifications = useAsync<AppNotification[]>(() => getBackend().listNotifications(), []);
  const { notify } = useToast();
  const [busy, setBusy] = useState(false);

  const items = notifications.data ?? [];
  const unread = items.filter((item) => !item.read).length;

  async function markAll() {
    setBusy(true);
    try {
      await getBackend().markAllNotificationsRead();
      notifications.reload();
      notify('All notifications marked as read.', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update notifications.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function markOne(id: string) {
    try {
      await getBackend().markNotificationRead(id);
      notifications.reload();
    } catch {
      /* non-critical */
    }
  }

  return (
    <div className="stack gap-20">
      <header className="between">
        <div>
          <p className="eyebrow">
            <Icon name="bell" size={14} /> Updates
          </p>
          <h1 className="h1">Notifications</h1>
          <p className="small muted">
            {unread === 0 ? 'You are all caught up.' : `${unread} unread update${unread === 1 ? '' : 's'}.`}
          </p>
        </div>
        {unread > 0 && (
          <button className="btn btn-ghost btn-sm" type="button" onClick={markAll} disabled={busy}>
            <Icon name="check" size={14} /> Mark all read
          </button>
        )}
      </header>

      {notifications.loading ? (
        <Loading label="Loading notifications…" />
      ) : notifications.error ? (
        <EmptyState icon="x" title="Could not load notifications" message={notifications.error} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="bell"
          title="No notifications yet"
          message="When a booking is confirmed, rescheduled or cancelled, the update lands here."
          action={
            <Link className="btn btn-outline btn-sm" to="/bookings">
              View bookings
            </Link>
          }
        />
      ) : (
        <div className="rows">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="list-item"
              style={{ textAlign: 'left', width: '100%', background: 'none', border: 0, cursor: 'pointer' }}
              onClick={() => !item.read && markOne(item.id)}
            >
              <div className="row gap-12" style={{ alignItems: 'flex-start' }}>
                <span className="service-icon" aria-hidden="true">
                  <Icon name={ICONS[item.type]} size={16} />
                </span>
                <div className="list-item-main">
                  <div className="list-item-top">
                    <strong>{item.title}</strong>
                    {!item.read && <span className="badge badge-brand">{notificationLabel[item.type]}</span>}
                  </div>
                  <p className="small muted">{item.body}</p>
                  <p className="tiny muted">{relativeTime(item.createdAt)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
