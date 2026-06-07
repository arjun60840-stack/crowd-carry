'use client';

import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Trash2, Loader2, Package, Plane, Star, AlertTriangle, Info } from 'lucide-react';
import api, { Notification } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import DashboardLayout from '@/app/dashboard/layout';

const notifIcons: Record<string, any> = {
  MATCH_FOUND: Plane,
  PACKAGE_ACCEPTED: CheckCheck,
  PACKAGE_DELIVERED: Package,
  REVIEW_RECEIVED: Star,
  WARNING: AlertTriangle,
  SYSTEM: Info,
};

const notifColors: Record<string, string> = {
  MATCH_FOUND: 'text-indigo-400 bg-indigo-400/10',
  PACKAGE_ACCEPTED: 'text-emerald-400 bg-emerald-400/10',
  PACKAGE_DELIVERED: 'text-green-400 bg-green-400/10',
  REVIEW_RECEIVED: 'text-amber-400 bg-amber-400/10',
  WARNING: 'text-red-400 bg-red-400/10',
  SYSTEM: 'text-blue-400 bg-blue-400/10',
};

function NotificationsContent() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.data || []);
      setUnreadCount(res.unreadCount || 0);
    } catch { } finally { setIsLoading(false); }
  };

  useEffect(() => { loadNotifications(); }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black font-syne text-white flex items-center gap-3">
          <Bell className="w-7 h-7 text-indigo-400" />
          Notifications
          {unreadCount > 0 && (
            <span className="text-base bg-indigo-500 text-white px-2.5 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="btn-secondary text-sm px-4 py-2 gap-2">
            <CheckCheck className="w-4 h-4" /> Mark All Read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center h-48 items-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Bell className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const Icon = notifIcons[notif.type] || Info;
            const colorClass = notifColors[notif.type] || 'text-gray-400 bg-gray-400/10';

            return (
              <div
                key={notif.id}
                onClick={() => !notif.isRead && handleMarkRead(notif.id)}
                className={`glass-card p-4 flex items-start gap-4 transition-all duration-200 cursor-pointer hover:border-white/20 ${
                  !notif.isRead ? 'border-indigo-500/30 bg-indigo-500/5' : 'opacity-70'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    {notif.title}
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    )}
                  </div>
                  <div className="text-sm text-gray-400 mt-0.5">{notif.message}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <DashboardLayout>
      <NotificationsContent />
    </DashboardLayout>
  );
}
