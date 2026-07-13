import { useEffect, useState } from 'react';
import { X, Bell, Volume2, VolumeX } from 'lucide-react';
import { useNotifications } from '../lib/NotificationContext';

export default function LiveNotificationPopup() {
  const { liveNotification, dismissLiveNotification, soundEnabled, toggleSound, unreadCount, notifications, markAsRead, markAllAsRead } = useNotifications();
  const [showPanel, setShowPanel] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (liveNotification) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [liveNotification]);

  const getBgColor = (type) => {
    switch (type) {
      case 'status_update': return 'bg-blue-500';
      case 'quotation': return 'bg-orange-500';
      case 'assignment': return 'bg-green-500';
      case 'approval': return 'bg-purple-500';
      default: return 'bg-gray-700';
    }
  };

  return (
    <>
      {/* Live Notification Toast */}
      {liveNotification && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm w-full transition-all duration-500 ${isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
          <div className={`${getBgColor(liveNotification.type)} text-white rounded-lg shadow-2xl p-4 border border-white/20`}>
            <div className="flex items-start gap-3">
              <div className="text-2xl animate-bounce">
                {liveNotification.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{liveNotification.title}</p>
                <p className="text-sm opacity-90 mt-0.5">{liveNotification.message}</p>
                <p className="text-xs opacity-70 mt-1">Just now</p>
              </div>
              <button 
                onClick={dismissLiveNotification}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white/60 rounded-full animate-shrink" />
            </div>
          </div>
        </div>
      )}

      {/* Notification Bell in Navbar - rendered via portal or can be placed in Navbar */}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-shrink {
          animation: shrink 5s linear forwards;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .notification-pulse::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: currentColor;
          animation: pulse-ring 1.5s ease-out infinite;
        }
      `}</style>
    </>
  );
}

// Notification Panel Component - can be toggled from navbar
export function NotificationPanel() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, soundEnabled, toggleSound } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Sound Toggle */}
      <button
        onClick={toggleSound}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
      >
        {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
          <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-80">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              notifications.slice(0, 20).map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                  className={`p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors ${!n.is_read ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getIconForNotification(n)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTimeAgo(n.created_at)}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}

function getIconForNotification(n) {
  const msg = (n.message || '').toLowerCase();
  if (msg.includes('received')) return '📦';
  if (msg.includes('inspection completed')) return '✅';
  if (msg.includes('quotation sent')) return '📄';
  if (msg.includes('approved')) return '👍';
  if (msg.includes('repair started')) return '🔧';
  if (msg.includes('spare parts')) return '⏳';
  if (msg.includes('testing')) return '🧪';
  if (msg.includes('ready')) return '📋';
  if (msg.includes('delivered')) return '🎉';
  if (n.type === 'assignment') return '📋';
  if (n.type === 'quotation') return '💰';
  return '🔔';
}

function formatTimeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}
