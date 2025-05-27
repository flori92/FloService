import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface ActiveChat {
  id: string;
  name: string;
  isOnline: boolean;
  position: { x: number; y: number };
}

interface ChatContextType {
  activeChats: ActiveChat[];
  openChat: (recipientId: string, recipientName: string, isOnline?: boolean) => void;
  closeChat: (recipientId: string) => void;
  minimizeAllChats: () => void;
  hasUnreadMessages: boolean;
  unreadCount: number;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Effet pour restaurer les chats actifs depuis le localStorage
  useEffect(() => {
    if (user) {
      const savedChats = localStorage.getItem(`floservice_active_chats_${user.id}`);
      if (savedChats) {
        try {
          const parsedChats = JSON.parse(savedChats);
          setActiveChats(parsedChats);
        } catch (error) {
          console.error('Erreur lors de la restauration des chats:', error);
        }
      }
      
      // S'abonner aux nouveaux messages
      const subscription = supabase
        .channel('messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        }, () => {
          // Mettre à jour le compteur de messages non lus
          checkUnreadMessages();
        })
        .subscribe();
      
      // Vérifier les messages non lus au démarrage
      checkUnreadMessages();
      
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);
  
  // Effet pour sauvegarder les chats actifs dans le localStorage
  useEffect(() => {
    if (user && activeChats.length > 0) {
      localStorage.setItem(`floservice_active_chats_${user.id}`, JSON.stringify(activeChats));
    }
  }, [activeChats, user]);
  
  // Fonction pour vérifier les messages non lus
  const checkUnreadMessages = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id')
        .eq('recipient_id', user.id)
        .eq('read', false);
      
      if (error) throw error;
      
      const count = data?.length || 0;
      setUnreadCount(count);
      setHasUnreadMessages(count > 0);
    } catch (error) {
      console.error('Erreur lors de la vérification des messages non lus:', error);
    }
  };
  
  // Fonction pour ouvrir une nouvelle conversation
  const openChat = (recipientId: string, recipientName: string, isOnline: boolean = false) => {
    // Vérifier si la conversation est déjà ouverte
    if (activeChats.some(chat => chat.id === recipientId)) {
      // Mettre à jour la position pour la mettre au premier plan (simuler un focus)
      setActiveChats(prev => prev.map(chat => 
        chat.id === recipientId 
          ? { ...chat, position: { x: chat.position.x + 1, y: chat.position.y + 1 } } 
          : chat
      ));
      return;
    }
    
    // Calculer une position décalée pour chaque nouvelle fenêtre
    const offset = activeChats.length * 30;
    const position = {
      x: (window.innerWidth / 2 - 175) + offset,
      y: (window.innerHeight / 2 - 225) + offset
    };
    
    // Ajouter la nouvelle conversation
    setActiveChats(prev => [
      ...prev,
      { id: recipientId, name: recipientName, isOnline, position }
    ]);
    
    // Mettre à jour le statut de présence
    updatePresence(true);
  };
  
  // Fonction pour fermer une conversation
  const closeChat = (recipientId: string) => {
    setActiveChats(prev => prev.filter(chat => chat.id !== recipientId));
    
    // Si c'était la dernière conversation, mettre à jour le statut de présence
    if (activeChats.length === 1) {
      updatePresence(false);
    }
  };
  
  // Fonction pour minimiser toutes les conversations
  const minimizeAllChats = () => {
    // Implémenter la logique de minimisation ici
    // Pour l'instant, on ferme simplement toutes les conversations
    setActiveChats([]);
    updatePresence(false);
  };
  
  // Fonction pour mettre à jour le statut de présence
  const updatePresence = async (isOnline: boolean) => {
    if (!user) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ 
          is_online: isOnline,
          last_seen: new Date().toISOString()
        })
        .eq('id', user.id);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut de présence:', error);
    }
  };
  
  return (
    <ChatContext.Provider 
      value={{ 
        activeChats, 
        openChat, 
        closeChat, 
        minimizeAllChats,
        hasUnreadMessages,
        unreadCount
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;
