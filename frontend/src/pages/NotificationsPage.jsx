import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

dayjs.extend(relativeTime);

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  async function fetchNotifications(pageToFetch) {
    try {
      setLoading(true);
      const res = await api.get(`/notifications?page=${pageToFetch}&limit=20`);
      if (res.data?.success) {
        setNotifications(res.data.data.notifications);
        setTotalPages(res.data.data.pages);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications(page);
  }, [page]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark read', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all read', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        {notifications.some(n => !n.isRead) && (
          <Button variant="outline" onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow border border-slate-200 divide-y divide-slate-100">
        {loading && notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No notifications found.</div>
        ) : (
          notifications.map(notification => (
            <div
              key={notification._id}
              className={`p-4 flex gap-4 transition-colors ${!notification.isRead ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Link
                    to={notification.link || '#'}
                    onClick={() => !notification.isRead && handleMarkAsRead(notification._id)}
                    className={`font-medium hover:underline ${!notification.isRead ? 'text-slate-900' : 'text-slate-700'}`}
                  >
                    {notification.title}
                  </Link>
                  {!notification.isRead && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      New
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600">{notification.message}</p>
                <p className="text-xs text-slate-400">{dayjs(notification.createdAt).fromNow()}</p>
              </div>

              {!notification.isRead && (
                <div className="flex-shrink-0 self-center">
                  <Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(notification._id)}>
                    Mark read
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <div className="flex items-center px-4 text-sm font-medium">
            Page {page} of {totalPages}
          </div>
          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
