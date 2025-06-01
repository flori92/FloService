/**
 * Composant de notification pour afficher des messages d'information, d'erreur et de succès
 * Utilise une approche minimaliste avec une animation fluide
 */

import React, { useState, useEffect, createContext, useContext } from 'react';

// Contexte pour le système de notification
const NotifierContext = createContext();

// Types de notifications
const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning'
};

// Couleurs par type de notification
const NOTIFICATION_COLORS = {
  [NOTIFICATION_TYPES.INFO]: 'bg-blue-500',
  [NOTIFICATION_TYPES.SUCCESS]: 'bg-green-500',
  [NOTIFICATION_TYPES.ERROR]: 'bg-red-500',
  [NOTIFICATION_TYPES.WARNING]: 'bg-yellow-500'
};

// Icônes par type de notification
const NOTIFICATION_ICONS = {
  [NOTIFICATION_TYPES.INFO]: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  [NOTIFICATION_TYPES.SUCCESS]: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  [NOTIFICATION_TYPES.ERROR]: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  [NOTIFICATION_TYPES.WARNING]: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
};

// Composant individuel de notification
const Notification = ({ id, type, message, onClose, duration = 5000 }) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClosing(true);
      setTimeout(() => {
        onClose(id);
      }, 300); // Durée de l'animation de fermeture
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  return (
    <div 
      className={`flex items-center p-4 mb-4 rounded-lg shadow-lg text-white ${NOTIFICATION_COLORS[type]} transition-all duration-300 ${isClosing ? 'opacity-0 transform translate-x-full' : 'opacity-100'}`}
    >
      <div className="mr-3">
        {NOTIFICATION_ICONS[type]}
      </div>
      <div className="flex-grow">{message}</div>
      <button 
        onClick={() => setIsClosing(true)}
        className="ml-auto text-white hover:text-gray-200 focus:outline-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

// Conteneur de notifications
const NotificationsContainer = ({ notifications, removeNotification }) => {
  return (
    <div className="fixed top-4 right-4 z-50 w-80">
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          id={notification.id}
          type={notification.type}
          message={notification.message}
          onClose={removeNotification}
          duration={notification.duration}
        />
      ))}
    </div>
  );
};

// Fournisseur de notifications
export const NotifierProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (type, message, duration = 5000) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message, duration }]);
    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const notifier = {
    info: (message, duration) => addNotification(NOTIFICATION_TYPES.INFO, message, duration),
    success: (message, duration) => addNotification(NOTIFICATION_TYPES.SUCCESS, message, duration),
    error: (message, duration) => addNotification(NOTIFICATION_TYPES.ERROR, message, duration),
    warning: (message, duration) => addNotification(NOTIFICATION_TYPES.WARNING, message, duration),
    remove: removeNotification
  };

  return (
    <NotifierContext.Provider value={notifier}>
      {children}
      <NotificationsContainer 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />
    </NotifierContext.Provider>
  );
};

// Hook pour utiliser le système de notification
export const useNotifier = () => {
  const context = useContext(NotifierContext);
  if (!context) {
    throw new Error('useNotifier doit être utilisé à l\'intérieur d\'un NotifierProvider');
  }
  return context;
};

export default { NotifierProvider, useNotifier };
