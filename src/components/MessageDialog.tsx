import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Paperclip, FileText, Video, Music, Loader2, Check, CheckCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { messagingService, Message } from '../services/messagingService';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MessageDialogProps {
  conversationId: string;
  providerName: string;
  onClose: () => void;
  isOnline?: boolean;
  providerId?: string;
  initialMessage?: string;
}

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'error';

interface MessageWithStatus extends Message {
  status?: MessageStatus;
  tempId?: string;
  isTemporary?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const MessageDialog: React.FC<MessageDialogProps> = ({
  conversationId,
  providerName,
  onClose,
  isOnline = false,
  initialMessage = ''
}) => {
  const [message, setMessage] = useState(initialMessage);
  const [messages, setMessages] = useState<MessageWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tempMessages, setTempMessages] = useState<MessageWithStatus[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();
  
  const PAGE_SIZE = 20;

  // Charger la conversation et les messages initiaux
  useEffect(() => {
    const loadConversationData = async () => {
      if (!conversationId || !user) return;
      
      try {
        setLoading(true);
        
        // Charger les détails de la conversation
        const { error: convError } = await messagingService.getConversation(conversationId);
        if (convError) throw convError;
        
        // Charger les messages
        await loadMessages(0);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        toast.error('Erreur lors du chargement de la conversation');
      } finally {
        setLoading(false);
      }
    };
    
    loadConversationData();
    
    // S'abonner aux nouveaux messages
    const unsubscribe = messagingService.subscribeToMessages(
      conversationId,
      (newMessage) => {
        // Ne pas ajouter les messages envoyés par l'utilisateur actuel (ils sont déjà gérés par tempMessages)
        if (newMessage.sender_id !== user?.id) {
          setMessages(prev => {
            // Vérifier si le message existe déjà
            if (prev.some(msg => msg.id === newMessage.id)) return prev;
            return [...prev, { ...newMessage, status: 'delivered' }];
          });
          // Marquer comme lu si nécessaire
          messagingService.markMessageAsRead(newMessage.id).catch(console.error);
        }
      }
    );
    
    return () => {
      unsubscribe();
    };
  }, [conversationId, user?.id]);

  // Faire défiler vers le bas lorsque de nouveaux messages sont ajoutés
  useEffect(() => {
    const allMessages = [...messages, ...tempMessages];
    if (allMessages.length > 0) {
      scrollToBottom();
    }
  }, [messages, tempMessages]);

  // Fonction pour charger les messages avec pagination
  const loadMessages = useCallback(async (pageToLoad: number) => {
    if (!conversationId) return;
    
    try {
      const { data, error } = await messagingService.getMessages(
        conversationId, 
        pageToLoad, 
        PAGE_SIZE
      );
      
      if (error) throw error;
      
      setMessages(prev => {
        if (pageToLoad === 0) return data || [];
        
        // Fusionner les nouveaux messages avec les existants en évitant les doublons
        const existingIds = new Set(prev.map(msg => msg.id));
        const newMessages = (data || []).filter(msg => !existingIds.has(msg.id));
        return [...prev, ...newMessages];
      });
      
      setHasMore(data && data.length >= PAGE_SIZE);
      setPage(pageToLoad);
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
      toast.error('Erreur lors du chargement des messages');
    }
  }, [conversationId]);

  // Gérer le défilement vers le haut pour charger plus de messages
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current || loading || !hasMore) return;
    
    const { scrollTop } = messagesContainerRef.current;
    if (scrollTop < 50) {
      loadMessages(page + 1);
    }
  }, [loading, hasMore, page, loadMessages]);

  // Fonction pour faire défiler vers le bas
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Vérifier le type et la taille du fichier
  const validateFile = (file: File) => {
    // Vérifier la taille du fichier (max 10MB)
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Le fichier ne doit pas dépasser 10MB');
      return false;
    }
    
    // Vérifier les types de fichiers autorisés
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'video/mp4', 'video/webm', 'video/ogg'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Type de fichier non pris en charge');
      return false;
    }
    
    return true;
  };

  // Gérer l'envoi d'un fichier
  const handleFileUpload = async (file: File) => {
    if (!file || !validateFile(file) || !user) return;
    
    try {
      setUploading(true);
      
      // Créer un message temporaire pour l'affichage immédiat
      const tempId = `temp-${Date.now()}`;
      let messageType: 'image' | 'video' | 'audio' | 'file' = 'file';
      
      if (file.type.startsWith('image/')) messageType = 'image';
      else if (file.type.startsWith('video/')) messageType = 'video';
      else if (file.type.startsWith('audio/')) messageType = 'audio';
      
      // Créer une URL temporaire pour l'aperçu
      const tempUrl = URL.createObjectURL(file);
      
      // Ajouter le message temporaire
      const tempMessage: MessageWithStatus = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        content: '',
        created_at: new Date().toISOString(),
        message_type: messageType,
        media_url: tempUrl,
        media_metadata: {
          name: file.name,
          size: file.size,
          type: file.type
        },
        status: 'sending',
        tempId,
        isTemporary: true
      };
      
      setTempMessages(prev => [...prev, tempMessage]);
      
      // Envoyer le message via le service
      const { data: sentMessage, error } = await messagingService.sendMessage(
        conversationId,
        '',  // Pas de contenu texte
        messageType,
        file
      );
      
      if (error) throw error;
      
      // Mettre à jour le statut du message temporaire
      if (sentMessage) {
        setTempMessages(prev => 
          prev.map(msg => 
            msg.tempId === tempId 
              ? { ...sentMessage, status: 'sent' as MessageStatus, isTemporary: false }
              : msg
          )
        );
        
        // Supprimer le message temporaire après un délai
        setTimeout(() => {
          setTempMessages(prev => prev.filter(msg => msg.tempId !== tempId));
          URL.revokeObjectURL(tempUrl); // Libérer l'URL temporaire
        }, 1000);
      }
      
      // Réinitialiser le champ de fichier
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi du fichier:', error);
      toast.error('Erreur lors de l\'envoi du fichier');
    } finally {
      setUploading(false);
    }
  };

  // Envoyer un message texte
  const sendMessage = async (content: string) => {
    if (!content.trim() || !user) return;
    
    try {
      setSending(true);
      
      // Créer un message temporaire
      const tempId = `temp-${Date.now()}`;
      const tempMessage: MessageWithStatus = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        created_at: new Date().toISOString(),
        message_type: 'text',
        status: 'sending',
        tempId,
        isTemporary: true
      };
      
      // Ajouter le message temporaire
      setTempMessages(prev => [...prev, tempMessage]);
      setMessage(''); // Vider le champ de texte
      
      // Envoyer le message via le service
      const { data: sentMessage, error } = await messagingService.sendMessage(
        conversationId,
        content
      );
      
      if (error) throw error;
      
      // Mettre à jour le statut du message temporaire
      if (sentMessage) {
        setTempMessages(prev => 
          prev.map(msg => 
            msg.tempId === tempId 
              ? { ...sentMessage, status: 'sent' as MessageStatus, isTemporary: false }
              : msg
          )
        );
        
        // Supprimer le message temporaire après un délai
        setTimeout(() => {
          setTempMessages(prev => prev.filter(msg => msg.tempId !== tempId));
        }, 1000);
      }
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      toast.error('Erreur lors de l\'envoi du message');
      
      // Mettre à jour le statut du message temporaire en cas d'erreur
      setTempMessages(prev => 
        prev.map(msg => 
          msg.tempId === `temp-${Date.now()}` 
            ? { ...msg, status: 'error' as MessageStatus }
            : msg
        )
      );
    } finally {
      setSending(false);
    }
  };

  // Gérer la soumission du formulaire (envoi de message ou fichier)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Vérifier si un fichier est sélectionné
    if (fileInputRef.current?.files?.length) {
      await handleFileUpload(fileInputRef.current.files[0]);
      return;
    }
    
    // Vérifier si un message texte est saisi
    if (message.trim()) {
      await sendMessage(message);
    }
  };
  
  // Gérer le changement de fichier
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Prévisualiser le fichier sélectionné
      const file = e.target.files[0];
      validateFile(file);
    }
  };

  // Fonction pour rendre un message (contenu, média, statut)
  const renderMessage = (msg: MessageWithStatus, isTemp = false) => {
    const isSentByUser = msg.sender_id === user?.id;
    const messageTime = formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: fr });
    
    // Déterminer l'icône de statut pour les messages envoyés par l'utilisateur
    const renderStatusIcon = () => {
      if (!isSentByUser) return null;
      
      switch (msg.status) {
        case 'sending':
          return <Loader2 className="w-3 h-3 animate-spin text-gray-400" />;
        case 'sent':
          return <Check className="w-3 h-3 text-gray-400" />;
        case 'delivered':
          return <Check className="w-3 h-3 text-gray-400" />;
        case 'read':
          return <CheckCheck className="w-3 h-3 text-blue-400" />;
        case 'error':
          return <span className="text-xs text-red-500">Échec</span>;
        default:
          return null;
      }
    };
    
    // Rendre le contenu du message en fonction de son type
    const renderMessageContent = () => {
      // Message avec média
      if (msg.message_type && msg.message_type !== 'text' && msg.media_url) {
        switch (msg.message_type) {
          case 'image':
            return (
              <div className="mb-1">
                <img 
                  src={msg.media_url} 
                  alt="Image" 
                  className="max-w-full rounded-lg max-h-[300px] object-contain" 
                />
                {msg.content && <p className="mt-2">{msg.content}</p>}
              </div>
            );
          case 'video':
            return (
              <div className="mb-1">
                <video 
                  src={msg.media_url} 
                  controls 
                  className="max-w-full rounded-lg max-h-[300px]" 
                />
                {msg.content && <p className="mt-2">{msg.content}</p>}
              </div>
            );
          case 'audio':
            return (
              <div className="mb-1">
                <audio src={msg.media_url} controls className="max-w-full" />
                {msg.content && <p className="mt-2">{msg.content}</p>}
              </div>
            );
          case 'file':
            return (
              <div className="mb-1">
                <a
                  href={msg.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-500 hover:text-blue-600"
                >
                  <FileText className="w-4 h-4" />
                  <span>{msg.media_metadata?.name || 'Fichier'}</span>
                </a>
                {msg.content && <p className="mt-2">{msg.content}</p>}
              </div>
            );
          default:
            return <p>{msg.content}</p>;
        }
      }
      
      // Message texte simple
      return <p>{msg.content}</p>;
    };
    
    return (
      <div
        key={msg.id}
        className={`flex ${isSentByUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className="flex flex-col max-w-[70%]">
          <div
            className={`rounded-lg p-3 ${isTemp ? 'opacity-80' : ''} ${
              isSentByUser
                ? 'bg-blue-600 text-white rounded-tr-none'
                : 'bg-gray-100 text-gray-900 rounded-tl-none'
            }`}
          >
            {renderMessageContent()}
          </div>
          
          <div className={`flex items-center mt-1 text-xs text-gray-500 ${isSentByUser ? 'justify-end' : 'justify-start'}`}>
            <span>{messageTime}</span>
            <span className="ml-2">{renderStatusIcon()}</span>
          </div>
        </div>
      </div>
    );
  };
  
  // Fonction pour rendre une prévisualisation de fichier avant envoi
  const renderFilePreview = () => {
    if (!fileInputRef.current?.files?.length) return null;
    
    const file = fileInputRef.current.files[0];
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    
    return (
      <div className="p-2 border rounded-md mb-2 flex items-center">
        {isImage ? (
          <div className="w-12 h-12 mr-2 relative">
            <img 
              src={URL.createObjectURL(file)} 
              alt="Aperçu" 
              className="w-full h-full object-cover rounded" 
            />
          </div>
        ) : isVideo ? (
          <Video className="w-8 h-8 mr-2 text-gray-500" />
        ) : isAudio ? (
          <Music className="w-8 h-8 mr-2 text-gray-500" />
        ) : (
          <FileText className="w-8 h-8 mr-2 text-gray-500" />
        )}
        
        <div className="flex-1 truncate">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
        </div>
        
        <button 
          type="button" 
          className="text-gray-500 hover:text-red-500"
          onClick={() => {
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold">{providerName}</h3>
            {isOnline && (
              <span className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                En ligne
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Fermer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        <div 
          className="flex-1 overflow-y-auto p-4"
          ref={messagesContainerRef}
          onScroll={handleScroll}
        >
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : messages.length === 0 && tempMessages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>Aucun message. Commencez la conversation !</p>
            </div>
          ) : (
            <>
              {/* Messages chargés depuis la base de données */}
              {messages.map((msg) => renderMessage(msg))}
              
              {/* Messages temporaires (en cours d'envoi) */}
              {tempMessages.map((msg) => renderMessage(msg, true))}
              
              {/* Élément pour faire défiler vers le bas */}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t p-4">
          {/* Prévisualisation du fichier sélectionné */}
          {renderFilePreview()}
          
          <div className="flex items-center space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-500 hover:text-gray-700 p-2"
              disabled={uploading || sending}
              aria-label="Joindre un fichier"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Écrivez votre message..."
              className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={uploading || sending}
            />
            
            <button
              type="submit"
              className="bg-blue-600 text-white rounded-lg p-2 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
              disabled={uploading || sending || (!message.trim() && !fileInputRef.current?.files?.length)}
              aria-label="Envoyer"
            >
              {uploading || sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
