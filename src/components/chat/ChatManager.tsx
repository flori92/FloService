import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { createContext, useContext } from 'react';
import ChatDialog from './ChatDialog';

interface ActiveChat {
  id: string;
  name: string;
  isOnline: boolean;
  position: { x: number; y: number };
}

// Création d'un contexte pour le gestionnaire de chat
interface ChatManagerContextValue {
  openChat: (recipientId: string, recipientName: string, isOnline?: boolean) => void;
  closeChat: (recipientId: string) => void;
}

const ChatManagerContext = createContext<ChatManagerContextValue | null>(null);

// Hook personnalisé pour utiliser le gestionnaire de chat
export const useChatManager = () => {
  const context = useContext(ChatManagerContext);
  if (!context) {
    throw new Error("useChatManager doit être utilisé à l'intérieur d'un ChatManagerProvider");
  }
  return context;
};

// Renommer en ChatManagerProvider pour plus de clarté
export const ChatManagerProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const { user } = useAuthStore();
  const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);
  
  // Effet pour restaurer les chats actifs depuis le localStorage - désactivé par défaut
  // Note: Nous avons désactivé la restauration automatique des chats pour éviter
  // l'ouverture intempestive des boîtes de dialogue au chargement de la page
  useEffect(() => {
    // Le code est commenté pour éviter l'ouverture automatique des chats
    // Si nécessaire, cette fonctionnalité peut être réactivée avec un paramètre de configuration
    /*
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
    }
    */
  }, [user]);
  
  // Effet pour sauvegarder les chats actifs dans le localStorage
  useEffect(() => {
    if (user && activeChats.length > 0) {
      localStorage.setItem(`floservice_active_chats_${user.id}`, JSON.stringify(activeChats));
    }
  }, [activeChats, user]);
  
  // Fonction pour mettre à jour le statut de présence
  const updatePresence = useCallback(async (isOnline: boolean) => {
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
  }, [user]);
  
  // Fonction pour ouvrir une nouvelle conversation
  const openChat = useCallback((recipientId: string, recipientName: string, isOnline: boolean = false) => {
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
  }, [activeChats, updatePresence]);
  
  // Fonction pour fermer une conversation
  const closeChat = useCallback((recipientId: string) => {
    setActiveChats(prev => prev.filter(chat => chat.id !== recipientId));
    
    // Si c'était la dernière conversation, mettre à jour le statut de présence
    if (activeChats.length === 1) {
      updatePresence(false);
    }
  }, [activeChats, updatePresence]);
  
  // Note: La fonction updatePresence a été déplacée plus haut dans le code
  
  // Créer la valeur du contexte
  const contextValue = {
    openChat,
    closeChat
  };

  return (
    <ChatManagerContext.Provider value={contextValue}>
      {children}
      {activeChats.map(chat => (
        <ChatDialog
          key={chat.id}
          recipientId={chat.id}
          recipientName={chat.name}
          isOnline={chat.isOnline}
          initialPosition={chat.position}
          onClose={() => closeChat(chat.id)}
        />
      ))}
    </ChatManagerContext.Provider>
  );
};

// Composant de compatibilité pour maintenir l'ancienne API
const ChatManager: React.FC = () => {
  return <ChatManagerProvider>{}</ChatManagerProvider>;
};

export default ChatManager;
