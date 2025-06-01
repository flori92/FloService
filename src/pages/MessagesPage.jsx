/**
 * Page de messagerie améliorée avec gestion d'erreurs et expérience utilisateur optimisée
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSupabaseRpc } from '../utils/hooks/useSupabaseQuery';
import { useMessageSubscription } from '../utils/hooks/useRealtimeSubscription';
import { useNotifier } from '../components/ui/Notifier';
import LoadingSpinner, { SPINNER_TYPES } from '../components/ui/LoadingSpinner';
import { EmptyMessages, ConnectionError } from '../components/ui/EmptyState';
import { useErrorHandler } from '../utils/errorHandler';

// Composant de message individuel
const MessageItem = ({ message, currentUserId, onMarkAsRead }) => {
  const isSender = message.sender_id === currentUserId;
  
  // Marquer le message comme lu lorsqu'il est affiché si l'utilisateur est le destinataire
  useEffect(() => {
    if (!isSender && !message.read) {
      onMarkAsRead(message.id);
    }
  }, [message.id, isSender, message.read, onMarkAsRead]);
  
  return (
    <div 
      className={`flex ${isSender ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div 
        className={`max-w-3/4 p-3 rounded-lg ${
          isSender 
            ? 'bg-indigo-600 text-white rounded-tr-none' 
            : 'bg-gray-100 text-gray-800 rounded-tl-none'
        }`}
      >
        <p className="text-sm">{message.content}</p>
        <p className={`text-xs mt-1 ${isSender ? 'text-indigo-200' : 'text-gray-500'}`}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {!isSender && message.read && (
            <span className="ml-2">✓ Lu</span>
          )}
        </p>
      </div>
    </div>
  );
};

// Composant de formulaire d'envoi de message
const MessageForm = ({ conversationId, recipientId, onMessageSent }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const notifier = useNotifier();
  const { handleError } = useErrorHandler();
  const inputRef = useRef(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    setIsSending(true);
    
    try {
      const { data, error } = await supabase.rpc('send_message', {
        p_conversation_id: conversationId,
        p_recipient_id: recipientId,
        p_content: message.trim()
      });
      
      if (error) throw error;
      
      setMessage('');
      if (onMessageSent) onMessageSent(data);
    } catch (error) {
      handleError(error);
    } finally {
      setIsSending(false);
      // Focus l'input après l'envoi
      if (inputRef.current) inputRef.current.focus();
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="border-t p-4 bg-white">
      <div className="flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Écrivez votre message..."
          className="flex-grow p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={isSending || !message.trim()}
          className="bg-indigo-600 text-white p-2 rounded-r-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isSending ? (
            <LoadingSpinner type={SPINNER_TYPES.DOTS} size="sm" color="#ffffff" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
};

// Page principale de messagerie
const MessagesPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const notifier = useNotifier();
  const { handleError } = useErrorHandler();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [recipientId, setRecipientId] = useState(null);
  const [page, setPage] = useState(0);
  const messagesEndRef = useRef(null);
  
  // Récupérer l'utilisateur courant
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      } else {
        navigate('/login');
      }
    };
    
    getCurrentUser();
  }, [navigate]);
  
  // Récupérer les messages avec le hook personnalisé
  const { 
    data: messages, 
    isLoading, 
    error, 
    refetch 
  } = useSupabaseRpc(
    'get_messages',
    { 
      p_conversation_id: conversationId,
      p_limit: 50,
      p_offset: page * 50
    },
    {
      enabled: !!conversationId && !!currentUserId,
      refetchInterval: 0,
      onError: (err) => handleError(err)
    }
  );
  
  // Récupérer les détails de la conversation
  useEffect(() => {
    const getConversationDetails = async () => {
      if (!conversationId || !currentUserId) return;
      
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('participant1_id, participant2_id')
          .eq('id', conversationId)
          .single();
        
        if (error) throw error;
        
        // Déterminer l'ID du destinataire
        const otherParticipantId = data.participant1_id === currentUserId 
          ? data.participant2_id 
          : data.participant1_id;
        
        setRecipientId(otherParticipantId);
      } catch (error) {
        handleError(error);
      }
    };
    
    getConversationDetails();
  }, [conversationId, currentUserId, handleError]);
  
  // S'abonner aux nouveaux messages
  const { isSubscribed } = useMessageSubscription(
    currentUserId,
    (newMessage) => {
      if (newMessage.conversation_id === conversationId) {
        refetch();
        notifier.info('Nouveau message reçu');
      }
    }
  );
  
  // Fonction pour marquer un message comme lu
  const markMessageAsRead = async (messageId) => {
    if (!currentUserId) return;
    
    try {
      await supabase.rpc('mark_message_as_read', {
        p_message_id: messageId,
        p_user_id: currentUserId
      });
    } catch (error) {
      console.error('Erreur lors du marquage du message comme lu:', error);
    }
  };
  
  // Faire défiler vers le bas lorsque de nouveaux messages sont chargés
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Gérer le chargement de messages plus anciens
  const loadMoreMessages = () => {
    setPage((prevPage) => prevPage + 1);
  };
  
  // Gérer l'envoi d'un nouveau message
  const handleMessageSent = () => {
    refetch();
  };
  
  // Afficher un indicateur de chargement pendant le chargement initial
  if (isLoading && !messages) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner 
          type={SPINNER_TYPES.CIRCLE} 
          size="lg" 
          label="Chargement des messages..."
        />
      </div>
    );
  }
  
  // Afficher une erreur en cas de problème
  if (error && !messages) {
    return (
      <div className="flex items-center justify-center h-screen">
        <ConnectionError onRetry={refetch} />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* En-tête de la conversation */}
      <header className="bg-white shadow-sm p-4 flex items-center">
        <button 
          onClick={() => navigate('/conversations')}
          className="mr-4 text-gray-600 hover:text-gray-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold">Conversation</h1>
        {!isSubscribed && (
          <span className="ml-auto text-yellow-600 text-sm flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Mode hors ligne
          </span>
        )}
      </header>
      
      {/* Corps de la conversation */}
      <div className="flex-grow overflow-y-auto p-4">
        {/* Bouton pour charger plus de messages */}
        {messages && messages.length >= 50 && (
          <div className="flex justify-center mb-4">
            <button 
              onClick={loadMoreMessages}
              className="px-4 py-2 text-sm text-indigo-600 bg-white border border-indigo-200 rounded-full hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Charger les messages précédents
            </button>
          </div>
        )}
        
        {/* Liste des messages */}
        {messages && messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageItem 
                key={message.id} 
                message={message} 
                currentUserId={currentUserId}
                onMarkAsRead={markMessageAsRead}
              />
            ))}
          </div>
        ) : (
          <EmptyMessages 
            onAction={() => navigate('/providers')} 
          />
        )}
        
        {/* Référence pour le défilement automatique */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Formulaire d'envoi de message */}
      {recipientId && (
        <MessageForm 
          conversationId={conversationId} 
          recipientId={recipientId}
          onMessageSent={handleMessageSent}
        />
      )}
    </div>
  );
};

export default MessagesPage;
