import { useRef, useEffect } from 'react';
import { Check, Trash2, Bell, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMarkNotificationRead, useDeleteNotification, useDeleteAllNotifications } from '../hooks/useScheduler';

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  event?: { title: string; date: string; course?: string } | null;
}

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
}

export function NotificationPanel({ notifications, onClose }: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: deleteNotif } = useDeleteNotification();
  const { mutate: deleteAll, isPending: deletingAll } = useDeleteAllNotifications();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      className="absolute right-0 top-12 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center gap-2">
        <Bell className="w-4 h-4 text-[#6B8E23]" />
        <h3 className="font-semibold text-gray-900">Notifications</h3>
        <span className="text-xs text-gray-400 ml-1">{notifications.length}</span>

        {/* Delete all — only shown when there are notifications */}
        {notifications.length > 0 && (
          <button
            onClick={() => deleteAll()}
            disabled={deletingAll}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" />
            {deletingAll ? 'Clearing…' : 'Clear all'}
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`group relative flex items-start gap-3 p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  !notif.isRead ? 'bg-green-50/40' : ''
                }`}
              >
                {/* Unread dot */}
                {!notif.isRead && (
                  <div className="w-2 h-2 bg-[#6B8E23] rounded-full mt-1.5 flex-shrink-0" />
                )}
                {notif.isRead && <div className="w-2 h-2 flex-shrink-0" />}

                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${notif.isRead ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>
                    {notif.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notif.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>

                {/* Actions — revealed on hover via group */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!notif.isRead && (
                    <button
                      onClick={() => markRead(notif.id)}
                      title="Mark as read"
                      className="p-1.5 rounded-lg hover:bg-green-100 text-green-600 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotif(notif.id)}
                    title="Delete"
                    className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Expand arrow placeholder */}
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:hidden" />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}