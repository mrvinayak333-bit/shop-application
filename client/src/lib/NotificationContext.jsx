import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from './api';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [liveNotification, setLiveNotification] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastCheckRef = useRef(new Date().toISOString());
  const audioRef = useRef(null);

  // Generate notification sound using Web Audio API
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Pleasant notification sound - two quick beeps
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      
      oscillator.stop(audioContext.currentTime + 0.4);
    } catch (e) {
      console.log('Audio not supported');
    }
  }, [soundEnabled]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      const res = await api.get('/notifications');

      // Support multiple response shapes from API or proxy
      let newNotifications = [];
      if (Array.isArray(res)) {
        newNotifications = res;
      } else if (res && Array.isArray(res.notifications)) {
        newNotifications = res.notifications;
      } else if (res && Array.isArray(res.data)) {
        newNotifications = res.data;
      } else if (res && Array.isArray(res.items)) {
        newNotifications = res.items;
      } else if (res && res.success && Array.isArray(res.payload)) {
        newNotifications = res.payload;
      }

      if (newNotifications.length === 0 && res && res.success === false) {
        // API reported an error; log and bail
        console.warn('Notifications API error:', res.message || res);
        return;
      }
        
        // Check for new notifications since last check
        const lastCheck = lastCheckRef.current;
        const newerNotifications = newNotifications.filter(n => new Date(n.created_at) > new Date(lastCheck));
        
        if (newerNotifications.length > 0) {
          // Show live notification for the newest one
          const latest = newerNotifications[0];
          setLiveNotification({
            id: latest.id,
            title: latest.title,
            message: latest.message,
            type: latest.type,
            icon: getNotificationIcon(latest.type, latest.message)
          });
          
          // Play sound
          playNotificationSound();
        }
        
        setNotifications(newNotifications);
        setUnreadCount(newNotifications.filter(n => !n.is_read).length);
        lastCheckRef.current = new Date().toISOString();
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [isAuthenticated, user, playNotificationSound]);

  // Get icon based on notification type and message
  const getNotificationIcon = (type, message) => {
    const msg = (message || '').toLowerCase();
    if (msg.includes('received') || msg.includes('device has been received')) return '📦';
    if (msg.includes('inspection completed') || msg.includes('inspection')) return '✅';
    if (msg.includes('quotation sent') || msg.includes('quotation')) return '📄';
    if (msg.includes('approved')) return '👍';
    if (msg.includes('repair started')) return '🔧';
    if (msg.includes('spare parts') || msg.includes('waiting')) return '⏳';
    if (msg.includes('testing') || msg.includes('quality')) return '🧪';
    if (msg.includes('ready') || msg.includes('delivery')) return '📋';
    if (msg.includes('delivered')) return '🎉';
    if (type === 'assignment') return '📋';
    if (type === 'quotation') return '💰';
    return '🔔';
  };

  // Mark notification as read
  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      for (const n of notifications.filter(n => !n.is_read)) {
        await api.put(`/notifications/${n.id}/read`);
      }
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // Dismiss live notification
  const dismissLiveNotification = () => {
    setLiveNotification(null);
  };

  // Toggle sound
  const toggleSound = () => {
    setSoundEnabled(prev => !prev);
  };

  // Poll for notifications every 5 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  // Auto-dismiss live notification after 5 seconds
  useEffect(() => {
    if (liveNotification) {
      const timer = setTimeout(() => {
        setLiveNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [liveNotification]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      liveNotification,
      soundEnabled,
      markAsRead,
      markAllAsRead,
      dismissLiveNotification,
      toggleSound,
      refreshNotifications: fetchNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

export default NotificationContext;
