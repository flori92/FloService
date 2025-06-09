/**
 * Hook personnalisé pour gérer les abonnements en temps réel avec Supabase
 * Permet de recevoir des notifications lorsque des données sont modifiées
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase.ts';
import { useNotifier } from '../../components/ui/Notifier.jsx';

/**
 * Hook pour s'abonner aux changements en temps réel d'une table Supabase
 * @param {Object} options - Options de configuration
 * @param {string} options.table - Nom de la table à surveiller
 * @param {string} options.schema - Schéma de la table (par défaut: 'public')
 * @param {string[]} options.events - Événements à surveiller ('INSERT', 'UPDATE', 'DELETE')
 * @param {Object} options.filter - Filtre à appliquer sur les événements
 * @param {Function} options.onInsert - Callback appelé lors d'une insertion
 * @param {Function} options.onUpdate - Callback appelé lors d'une mise à jour
 * @param {Function} options.onDelete - Callback appelé lors d'une suppression
 * @param {boolean} options.showNotifications - Si true, affiche des notifications pour les événements
 * @returns {Object} - État de l'abonnement et fonctions utilitaires
 */
const useRealtimeSubscription = ({
  table,
  schema = 'public',
  events = ['INSERT', 'UPDATE', 'DELETE'],
  filter = {},
  onInsert = null,
  onUpdate = null,
  onDelete = null,
  showNotifications = false
}) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [error, setError] = useState(null);
  const subscriptionRef = useRef(null);
  const notifier = useNotifier();

  // Fonction pour gérer les événements reçus
  const handleEvent = useCallback((payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    setLastEvent({
      type: eventType,
      data: newRecord || oldRecord,
      timestamp: new Date()
    });
    
    // Appeler le callback approprié en fonction du type d'événement
    switch (eventType) {
      case 'INSERT':
        if (onInsert) onInsert(newRecord);
        if (showNotifications) notifier.info('Nouvelle donnée ajoutée');
        break;
      case 'UPDATE':
        if (onUpdate) onUpdate(newRecord, oldRecord);
        if (showNotifications) notifier.info('Donnée mise à jour');
        break;
      case 'DELETE':
        if (onDelete) onDelete(oldRecord);
        if (showNotifications) notifier.info('Donnée supprimée');
        break;
      default:
        break;
    }
  }, [onInsert, onUpdate, onDelete, showNotifications, notifier]);

  // S'abonner aux changements
  const subscribe = useCallback(() => {
    try {
      // Créer le canal d'abonnement directement
      const channel = supabase.channel(`${schema}:${table}`);

      const subscription = channel.on(
        'postgres_changes',
        {
          event: events,
          schema,
          table,
          ...filter
        },
        handleEvent
      );

      subscription.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
          setError(null);
        }
      });

      subscriptionRef.current = { channel, subscription };

      return () => {
        if (subscriptionRef.current) {
          supabase.removeChannel(subscriptionRef.current.channel);
          setIsSubscribed(false);
        }
      };
    } catch (err) {
      setError(err);
      setIsSubscribed(false);
      console.error('Erreur lors de l\'abonnement aux changements:', err);
    }
  }, [schema, table, events, filter, handleEvent]);

  // Se désabonner
  const unsubscribe = useCallback(() => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current.channel);
      subscriptionRef.current = null;
      setIsSubscribed(false);
    }
  }, []);

  // S'abonner au montage et se désabonner au démontage
  useEffect(() => {
    const cleanup = subscribe();
    return () => {
      if (cleanup) cleanup();
    };
  }, [subscribe]);

  return {
    isSubscribed,
    lastEvent,
    error,
    unsubscribe,
    resubscribe: subscribe
  };
};

/**
 * Hook spécifique pour s'abonner aux nouveaux messages
 * @param {string} userId - ID de l'utilisateur courant
 * @param {Function} onNewMessage - Callback appelé lors de la réception d'un nouveau message
 */
export const useMessageSubscription = (userId, onNewMessage) => {
  return useRealtimeSubscription({
    table: 'messages',
    events: ['INSERT'],
    filter: {
      filter: userId ? `recipient_id=eq.${userId}` : undefined
    },
    onInsert: (message) => {
      if (onNewMessage) onNewMessage(message);
    },
    showNotifications: true
  });
};

/**
 * Hook spécifique pour s'abonner aux mises à jour de profil
 * @param {string} userId - ID de l'utilisateur courant
 * @param {Function} onProfileUpdate - Callback appelé lors de la mise à jour d'un profil
 */
export const useProfileSubscription = (userId, onProfileUpdate) => {
  return useRealtimeSubscription({
    table: 'profiles',
    events: ['UPDATE'],
    filter: {
      filter: userId ? `id=eq.${userId}` : undefined
    },
    onUpdate: (newProfile, oldProfile) => {
      if (onProfileUpdate) onProfileUpdate(newProfile, oldProfile);
    }
  });
};

/**
 * Hook spécifique pour s'abonner aux mises à jour des conversations
 * @param {string} userId - ID de l'utilisateur courant
 * @param {Function} onConversationUpdate - Callback appelé lors de la mise à jour d'une conversation
 */
export const useConversationSubscription = (userId, onConversationUpdate) => {
  return useRealtimeSubscription({
    table: 'conversations',
    events: ['UPDATE', 'INSERT'],
    filter: {
      filter: userId ? `or(client_id.eq.${userId},provider_id.eq.${userId})` : undefined
    },
    onUpdate: (newConversation, oldConversation) => {
      if (onConversationUpdate) onConversationUpdate({
        ...newConversation,
        eventType: 'UPDATE',
        oldData: oldConversation
      });
    },
    onInsert: (newConversation) => {
      if (onConversationUpdate) onConversationUpdate({
        ...newConversation,
        eventType: 'INSERT'
      });
    }
  });
};

export default useRealtimeSubscription;