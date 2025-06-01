import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import enhancedSupabase from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import Chat from '../components/Chat';

// Composants d'amélioration UX
import { useNotifier } from '../components/ui/Notifier';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { EmptyMessages, ConnectionError } from '../components/ui/EmptyState';

// Hooks personnalisés
import { useSupabaseRpc } from '../utils/hooks/useSupabaseQuery';
import { useConversationSubscription } from '../utils/hooks/useRealtimeSubscription';
import useErrorHandler from '../utils/hooks/useErrorHandler';

// Définition plus précise pour les participants
interface Participant {
  id: string;
  full_name?: string;
  avatar_url?: string;
}

interface Conversation {
  id: string;
  provider_id: string;
  client_id: string;
  last_message?: string;
  last_message_time?: string;
  other_participant_name?: string;
  other_participant_avatar?: string;
  provider?: Participant | null; // Doit être un objet ou null, pas un tableau
  client?: Participant | null;   // Doit être un objet ou null, pas un tableau
  updated_at?: string; 
}

const Messages: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const notifier = useNotifier();
  const { handleError } = useErrorHandler();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    loadConversations();
  }, [user, navigate]);
  
  // Abonnement en temps réel aux conversations
  useConversationSubscription(
    user?.id,
    (payload) => {
      // Rafraîchir les conversations quand il y a un changement
      loadConversations();
      
      // Notification pour les nouvelles conversations
      if (payload.eventType === 'INSERT') {
        notifier.info('Nouvelle conversation créée');
      }
    }
  );

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      if (!user) return;

      // Utilisation de la fonction RPC sécurisée au lieu d'une requête directe
      const { data, error } = await enhancedSupabase.rpc('get_user_conversations', {
        p_user_id: user.id
      });

      if (error) {
        handleError(error, {
          customMessage: 'Impossible de charger vos conversations'
        });
        return;
      }

      const formattedConversations = (data || []).map((conv): Conversation => {
        const otherParticipant = conv.provider_id === user.id ? conv.client : conv.provider;
        return {
          id: conv.id,
          provider_id: conv.provider_id,
          client_id: conv.client_id,
          last_message: conv.last_message || undefined,
          last_message_time: conv.last_message_time || undefined,
          updated_at: conv.updated_at || undefined,
          provider: conv.provider,
          client: conv.client,
          other_participant_name: otherParticipant?.full_name || 'Utilisateur inconnu',
          other_participant_avatar: otherParticipant?.avatar_url || undefined
        };
      });
      
      setConversations(formattedConversations);
      notifier.success('Conversations chargées avec succès', 2000);
    } catch (error) {
      handleError(error, {
        customMessage: 'Erreur lors du chargement des conversations'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-24">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
            {/* Conversations List */}
            <div className="border-r border-gray-200">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">Messages</h2>
                <button 
                  onClick={() => loadConversations()} 
                  className="text-indigo-600 hover:text-indigo-800 text-sm"
                  disabled={isLoading}
                >
                  Actualiser
                </button>
              </div>
              
              {isLoading ? (
                <div className="p-8 flex justify-center">
                  <LoadingSpinner size="MD" label="Chargement des conversations..." />
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4">
                  <EmptyMessages onAction={() => navigate('/providers')} />
                </div>
              ) : (
                <div className="divide-y">
                  {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedConversation === conversation.id ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={conversation.other_participant_avatar || 'https://via.placeholder.com/40'} 
                        alt={conversation.other_participant_name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <h3 className="font-medium">{conversation.other_participant_name}</h3> 
                        <p className="text-sm text-gray-500 truncate">
                          {conversation.last_message || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chat Area */}
            <div className="col-span-2 lg:col-span-3 h-[600px]">
              {selectedConversation ? (
                <Chat
                  conversationId={selectedConversation} 
                  onClose={() => setSelectedConversation(null)}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center p-8">
                    <h3 className="text-xl font-medium mb-2">Sélectionnez une conversation</h3>
                    <p className="text-gray-500 mb-4">Choisissez une conversation dans la liste pour commencer à échanger des messages</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Messages;