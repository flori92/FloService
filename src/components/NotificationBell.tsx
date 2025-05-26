import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, loadNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const { user } = useAuthStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadNotifications();

      const subscription = supabase
        .channel('notifications')
        .on('INSERT', { event: '*', schema: 'public', table: 'notifications' }, 
          payload => {
            if (payload.new.user_id === user.id) {
              useNotificationStore.getState().addNotification(payload.new);
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (id: string) => {
    await markAsRead(id);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg overflow-hidden z-50">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-sm text-teal-600 hover:text-teal-700"
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification.id)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <p className="text-sm text-gray-900">{notification.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                Aucune notification
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};