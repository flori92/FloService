import React, { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

interface Conversation {
  conversation_id: string;
  other_participant_id: string;
  other_participant_name: string;
  other_participant_avatar: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_online: boolean;
}

const ChatFloatingButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const { hasUnreadMessages, unreadCount, openChat } = useChat();
  const { user } = useAuthStore();

  // Récupérer les conversations récentes
  useEffect(() => {
    if (user && isOpen) {
      fetchRecentConversations();
    }
  }, [user, isOpen]);

  const fetchRecentConversations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Vérifier si la fonction RPC existe
      try {
        // Utiliser la fonction RPC pour récupérer les conversations
        const { data, error } = await supabase.rpc('get_user_conversations', {
          user_id: user.id
        });
        
        if (error) {
          console.log('La fonction RPC n\'existe pas encore, migration probablement non appliquée');
          setConversations([]);
          return;
        }
        
        // Récupérer les statuts en ligne des participants
        if (data && data.length > 0) {
          // Accepter tous les formats d'ID, y compris les ID de test
          const participantIds = data
            .map((conv: Conversation) => conv.other_participant_id)
            .filter((id: string) => id && id.length > 0);
          
          if (participantIds.length > 0) {
            const { data: onlineStatus } = await supabase
              .from('profiles')
              .select('id, is_online')
              .in('id', participantIds);
            
            // Fusionner les données
            const conversationsWithStatus = data.map((conv: Conversation) => {
              const participant = onlineStatus?.find(p => p.id === conv.other_participant_id);
              return {
                ...conv,
                is_online: participant?.is_online || false
              };
            });
            
            setConversations(conversationsWithStatus);
          } else {
            setConversations(data);
          }
        } else {
          setConversations([]);
        }
      } catch (rpcError) {
        console.error('Erreur avec la fonction RPC:', rpcError);
        setConversations([]);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = (conversation: Conversation) => {
    openChat(
      conversation.other_participant_id,
      conversation.other_participant_name,
      conversation.is_online
    );
    setIsOpen(false);
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-72 bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 mb-2">
          <div className="p-3 bg-teal-600 text-white flex justify-between items-center">
            <h3 className="font-medium">Conversations récentes</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Chargement...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">Aucune conversation récente</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {conversations.map(conversation => (
                  <li 
                    key={conversation.conversation_id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleOpenChat(conversation)}
                  >
                    <div className="flex items-center p-3">
                      <div className="relative">
                        {conversation.other_participant_avatar ? (
                          <img 
                            src={conversation.other_participant_avatar} 
                            alt={conversation.other_participant_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-medium">
                            {conversation.other_participant_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        
                        {conversation.is_online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                        )}
                      </div>
                      
                      <div className="ml-3 flex-1 overflow-hidden">
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {conversation.other_participant_name}
                          </p>
                          {conversation.unread_count > 0 && (
                            <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                              {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {conversation.last_message || 'Nouvelle conversation'}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-teal-600 hover:bg-teal-700 text-white rounded-full p-3 shadow-lg flex items-center justify-center relative"
      >
        <MessageCircle size={24} />
        {hasUnreadMessages && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default ChatFloatingButton;
