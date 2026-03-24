import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  file_url?: string;
  file_type?: string;
  created_at: string;
}

interface ChatProps {
  conversationId: string;
  onClose: () => void;
}

const Chat: React.FC<ChatProps> = ({ conversationId, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1); 
  const [hasMoreMessages, setHasMoreMessages] = useState(true); 
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const subscriptionRef = useRef<any>(null);

  // Fonction pour vérifier et rafraîchir la session
  const checkAndRefreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      if (!data.session) {
        // Si pas de session valide, rediriger vers la page de connexion
        window.location.href = '/login';
        return false;
      }
      return true;
    } catch (err) {
      console.error('Erreur lors de la vérification de la session:', err);
      return false;
    }
  };

  useEffect(() => {
    const initializeChat = async () => {
      if (!user || !conversationId) {
        const hasValidSession = await checkAndRefreshSession();
        if (!hasValidSession) return;
      }

      try {
        setIsLoading(true);
        setError(null);
        await loadMessages(true);
        setupRealtimeSubscription();
      } catch (err) {
        console.error('Erreur lors de l\'initialisation du chat:', err);
        setError('Impossible de charger les messages. Veuillez réessayer.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();

    // Nettoyage de l'abonnement lors du démontage du composant
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [user, conversationId]);

  const setupRealtimeSubscription = () => {
    if (!conversationId) return;

    const channelName = `conversation-${conversationId}`;
    
    // Supprimer l'abonnement existant s'il y en a un
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          // Vérifier si le message n'est pas déjà dans la liste pour éviter les doublons
          setMessages(prevMessages => {
            if (prevMessages.find(msg => msg.id === (payload.new as Message).id)) {
              return prevMessages;
            }
            return [...prevMessages, payload.new as Message];
          });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to ${channelName}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Subscription error on ${channelName}:`, err);
          // Tenter de se réabonner après un délai en cas d'erreur
          setTimeout(setupRealtimeSubscription, 5000);
        }
      });

    subscriptionRef.current = subscription;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async (initialLoad = false) => {
    if (!user || !conversationId || (!hasMoreMessages && !initialLoad)) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const pageSize = 50; 
      const pageToLoad = initialLoad ? 1 : currentPage;

      const { data, error } = await supabase.rpc('get_conversation_messages', {
        p_conversation_id: conversationId, 
        p_page_size: pageSize,
        p_page_number: pageToLoad 
      });

      if (error) {
        // Si erreur d'authentification, vérifier la session
        if (error.code === 'PGRST301' || error.message.includes('JWT')) {
          const hasValidSession = await checkAndRefreshSession();
          if (!hasValidSession) return;
          // Réessayer après rafraîchissement de la session
          return loadMessages(initialLoad);
        }
        throw error;
      }
      
      const fetchedMessages = (data || []) as Message[];

      if (initialLoad) {
        setMessages(fetchedMessages);
      } else {
        setMessages(prevMessages => [...fetchedMessages, ...prevMessages]);
      }
      
      setHasMoreMessages(fetchedMessages.length === pageSize);
      if (!initialLoad) {
        setCurrentPage(prevPage => prevPage + 1);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
      setError('Une erreur est survenue lors du chargement des messages. Veuillez réessayer.');
      toast.error('Erreur lors du chargement des messages');
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        await uploadAndSendFile(audioBlob, 'audio/wav');
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      toast.error('Error accessing microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      await uploadAndSendFile(file);
    }
  };

  const uploadAndSendFile = async (file: File | Blob, fileType?: string) => {
    try {
      setIsUploading(true);
      const fileName = `${Date.now()}-${file instanceof File ? file.name : 'audio.wav'}`;
      
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (error) throw error;

      const fileUrl = data.path;
      await sendMessage('', fileUrl, fileType || file.type);
    } catch (error) {
      toast.error('Error uploading file');
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
    }
  };

  const sendMessage = async (content: string, fileUrl?: string, fileType?: string) => {
    try {
      if (!user) throw new Error('Not authenticated');
      if (!content && !fileUrl) return;

      const message = {
        sender_id: user.id,
        conversation_id: conversationId,
        content,
        file_url: fileUrl,
        file_type: fileType
      };

      const { error } = await supabase
        .from('messages')
        .insert([message]);

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      toast.error('Error sending message');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessage(newMessage.trim());
    }
  };

  // Afficher l'état de chargement initial
  if (isLoading && messages.length === 0) {
    return (
      <div className="fixed bottom-0 right-4 w-96 h-[600px] bg-white rounded-t-lg shadow-xl flex flex-col">
        <div className="bg-primary-600 text-white p-4 flex justify-between items-center rounded-t-lg">
          <h2 className="text-lg font-semibold">Chargement...</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  // Afficher les erreurs
  if (error) {
    return (
      <div className="fixed bottom-0 right-4 w-96 h-[600px] bg-white rounded-t-lg shadow-xl flex flex-col">
        <div className="bg-primary-600 text-white p-4 flex justify-between items-center rounded-t-lg">
          <h2 className="text-lg font-semibold">Erreur</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-700 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 right-4 w-96 h-[600px] bg-white rounded-t-lg shadow-xl flex flex-col">
      <div className="p-4 border-b flex justify-between items-center bg-teal-600 rounded-t-lg">
        <h3 className="text-lg font-semibold text-white">Chat</h3>
        <button onClick={onClose} className="text-white hover:text-gray-200">
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {hasMoreMessages && (
          <div className="flex justify-center mb-4">
            <button 
              onClick={() => loadMessages(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm text-gray-700 flex items-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Chargement...
                </>
              ) : 'Charger plus de messages'}
            </button>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.sender_id === user?.id
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.file_url ? (
                message.file_type?.startsWith('image/') ? (
                  <img
                    src={`${supabase.storage.from('chat-attachments').getPublicUrl(message.file_url).data.publicUrl}`}
                    alt="Attachment"
                    className="max-w-full rounded"
                  />
                ) : message.file_type?.startsWith('audio/') ? (
                  <audio controls className="max-w-full">
                    <source
                      src={`${supabase.storage.from('chat-attachments').getPublicUrl(message.file_url).data.publicUrl}`}
                      type={message.file_type}
                    />
                  </audio>
                ) : (
                  <a
                    href={`${supabase.storage.from('chat-attachments').getPublicUrl(message.file_url).data.publicUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline"
                  >
                    View attachment
                  </a>
                )
              ) : (
                <p>{message.content}</p>
              )}
              <span className="text-xs opacity-75 mt-1 block">
                {new Date(message.created_at).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,video/*,application/pdf"
            />
            <Paperclip className="h-6 w-6 text-gray-500 hover:text-teal-600" />
          </label>
          
          <button
            type="button"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={`${isRecording ? 'text-red-500' : 'text-gray-500 hover:text-teal-600'}`}
          >
            <Mic className="h-6 w-6" />
          </button>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:border-teal-600"
          />
          
          <button
            type="submit"
            disabled={isUploading || (!newMessage.trim() && !selectedFile)}
            className="text-teal-600 hover:text-teal-700 disabled:opacity-50"
          >
            <Send className="h-6 w-6" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;