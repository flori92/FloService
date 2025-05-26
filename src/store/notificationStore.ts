import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface Notification {
  id: string;
  type: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loadNotifications: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  
  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.read ? 0 : 1)
    }));

    // Play notification sound
    const audio = new Audio('/notification.mp3');
    audio.play().catch(() => {}); // Ignore errors if sound can't play
  },

  markAsRead: async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        notifications: state.notifications.map(n => 
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false);

      if (error) throw error;

      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0
      }));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  },

  loadNotifications: async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const unreadCount = (data || []).filter(n => !n.read).length;

      set({
        notifications: data || [],
        unreadCount
      });
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }
}));