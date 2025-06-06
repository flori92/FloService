import React, { useState, useRef, useEffect } from 'react';
import { X, Maximize2, Minimize2, Send, Move, Paperclip, Image, File } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import ChatOfferButton from './ChatOfferButton';

interface ChatDialogProps {
  recipientId: string;
  recipientName: string;
  isOnline?: boolean;
  onClose: () => void;
  initialPosition?: { x: number; y: number };
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read: boolean;
  has_attachment?: boolean;
  conversation_id?: string;
}

const ChatDialog: React.FC<ChatDialogProps> = ({
  recipientId,
  recipientName,
  isOnline = false,
  onClose,
  initialPosition = { x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 250 }
}) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastActivity, setLastActivity] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Effet pour initialiser la conversation et charger les messages
  useEffect(() => {
    if (user && recipientId) {
      initializeConversation();
    }
  }, [user, recipientId]);
  
  // Effet pour faire défiler vers le bas lorsque de nouveaux messages arrivent
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Effet pour gérer le déplacement de la boîte de dialogue
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - (chatRef.current?.offsetWidth || 400), e.clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - (chatRef.current?.offsetHeight || 500), e.clientY - dragOffset.y))
      });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);
  
  // Effet pour mettre à jour le statut "dernière activité"
  useEffect(() => {
    if (!isOnline && recipientId) {
      fetchLastActivity();
    }
  }, [isOnline, recipientId]);
  
  const initializeConversation = async () => {
    try {
      setLoading(true);
      
      // Créer ou récupérer une conversation
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        p_client_id: user?.id,
        p_provider_external_id: recipientId
      });
      
      if (error) {
        console.error('Error creating conversation:', error);
        toast.error('Une erreur est survenue lors de la création de la conversation');
        return;
      }
      
      // Stocker l'ID de conversation
      setConversationId(data);
      
      // Charger les messages
      await loadMessages(data);
      
      // S'abonner aux nouveaux messages
      subscribeToMessages(data);
      
    } catch (error) {
      console.error('Error initializing conversation:', error);
      toast.error('Une erreur est survenue lors de l\'initialisation de la conversation');
    } finally {
      setLoading(false);
    }
  };
  
  const subscribeToMessages = (convId: string) => {
    const subscription = supabase
      .channel(`messages:${convId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${convId}`
      }, (payload) => {
        // Ajouter le nouveau message s'il n'est pas déjà présent
        const newMessage = payload.new as Message;
        setMessages(prev => {
          if (prev.some(msg => msg.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
        scrollToBottom();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  };
  
  const fetchLastActivity = async () => {
    if (!recipientId) return;
    
    try {
      // Vérifier d'abord si la table profiles existe
      const { error: tableError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (tableError) {
        console.log('Erreur lors de la vérification de la table profiles:', tableError);
        return;
      }
      
      // Pour les IDs externes (comme tg-2), on vérifie dans la table de mapping
      if (recipientId.includes('-')) {
        const { data, error } = await supabase
          .from('external_id_mapping')
          .select('metadata, updated_at')
          .eq('external_id', recipientId)
          .single();
          
        if (error) {
          console.log('Erreur lors de la récupération des données de mapping:', error);
          return;
        }
        
        if (data) {
          const lastSeen = new Date(data.updated_at);
          const now = new Date();
          const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
          
          if (diffMinutes < 1) {
            setLastActivity('Vu à l\'instant');
          } else if (diffMinutes < 60) {
            setLastActivity(`Vu il y a ${diffMinutes} min`);
          } else if (diffMinutes < 1440) {
            const hours = Math.floor(diffMinutes / 60);
            setLastActivity(`Vu il y a ${hours} h`);
          } else {
            const days = Math.floor(diffMinutes / 1440);
            setLastActivity(`Vu il y a ${days} j`);
          }
        }
        return;
      }
      
      // Pour les IDs normaux (UUID), on vérifie dans profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('last_seen')
        .eq('id', recipientId)
        .single();
        
      if (error) {
        console.log('Erreur lors de la récupération de la dernière activité:', error);
        return;
      }
      
      if (data && data.last_seen) {
        const lastSeen = new Date(data.last_seen);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
        
        if (diffMinutes < 1) {
          setLastActivity('Vu à l\'instant');
        } else if (diffMinutes < 60) {
          setLastActivity(`Vu il y a ${diffMinutes} min`);
        } else if (diffMinutes < 1440) {
          const hours = Math.floor(diffMinutes / 60);
          setLastActivity(`Vu il y a ${hours} h`);
        } else {
          const days = Math.floor(diffMinutes / 1440);
          setLastActivity(`Vu il y a ${days} j`);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la dernière activité:', error);
    }
  };
  
  const loadMessages = async (convId: string) => {
    if (!convId) return;
    
    try {
      // Utiliser la fonction RPC pour récupérer les messages
      const { data, error } = await supabase.rpc('get_conversation_messages', {
        p_conversation_id: convId,
        p_page_size: 50,
        p_page_number: 1
      });
      
      if (error) {
        console.error('Erreur lors du chargement des messages:', error);
        return;
      }
      
      if (data) {
        // Trier les messages par date (du plus ancien au plus récent)
        const sortedMessages = [...data].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setMessages(sortedMessages);
        
        // Marquer les messages comme lus
        const unreadMessages = sortedMessages.filter(msg => 
          msg.recipient_id === user?.id && !msg.read
        );
        
        if (unreadMessages.length > 0) {
          await Promise.all(unreadMessages.map(msg => 
            supabase
              .from('messages')
              .update({ read: true })
              .eq('id', msg.id)
          ));
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    }
  };
  
  const handleStartDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (chatRef.current) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };
  
  const handleFileUpload = async (file: File) => {
    if (!user || !conversationId) return;
    
    try {
      setUploading(true);
      setUploadProgress(0);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      // Vérifier si le bucket 'attachments' existe
      const { error: bucketError } = await supabase
        .storage
        .getBucket('attachments');
      
      // Si le bucket n'existe pas, on le crée
      if (bucketError) {
        await supabase.storage.createBucket('attachments', {
          public: true,
          fileSizeLimit: 10485760 // 10MB
        });
      }
      
      // Simuler la progression du téléchargement
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);
      
      // Télécharger le fichier
      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      clearInterval(interval);
      
      if (error) {
        throw error;
      }
      
      setUploadProgress(100);
      
      // Obtenir l'URL publique du fichier
      const { data: publicUrlData } = await supabase
        .storage
        .from('attachments')
        .getPublicUrl(filePath);
      
      // Déterminer le type de fichier
      const isImage = file.type.startsWith('image/');
      
      // Envoyer un message avec la pièce jointe
      const attachmentContent = isImage 
        ? `[IMAGE]${publicUrlData.publicUrl}` 
        : `[FICHIER]${file.name}|${publicUrlData.publicUrl}`;
      
      await sendMessage(conversationId, attachmentContent, true);
      
      setUploadProgress(0);
      toast.success('Fichier envoyé avec succès');
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi du fichier:', error);
      toast.error('Impossible d\'envoyer le fichier');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setSelectedFile(null);
    }
  };
  
  const handleAttachmentClick = () => {
    setShowAttachmentMenu(!showAttachmentMenu);
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Vérifier la taille du fichier (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Le fichier est trop volumineux (max 10MB)');
        return;
      }
      handleFileUpload(file);
    }
    // Réinitialiser l'input pour permettre de sélectionner le même fichier plusieurs fois
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const sendMessage = async (convId: string, content: string, hasAttachment: boolean = false) => {
    if (!content.trim() && !hasAttachment) return;
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          sender_id: user.id,
          content: content,
          read: false,
          has_attachment: hasAttachment
        })
        .select();
      
      if (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        toast.error('Impossible d\'envoyer le message');
        return;
      }
      
      // Le message sera ajouté via la souscription en temps réel
      setNewMessage('');
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      toast.error('Impossible d\'envoyer le message');
    }
  };
  
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;
    await sendMessage(conversationId, newMessage.trim());
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  return (
    <div 
      ref={chatRef}
      className={`fixed bg-white rounded-lg shadow-xl overflow-hidden transition-all duration-300 z-50 flex flex-col ${
        isExpanded ? 'w-[500px] h-[600px]' : 'w-[350px] h-[450px]'
      }`}
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        resize: isExpanded ? 'both' : 'none'
      }}
    >
      {/* En-tête de la boîte de dialogue */}
      <div 
        className="bg-teal-600 text-white p-3 flex justify-between items-center cursor-move"
        onMouseDown={handleStartDrag}
      >
        <div className="flex items-center">
          <Move className="h-4 w-4 mr-2 opacity-50" />
          <div>
            <h3 className="font-medium">{recipientName}</h3>
            <p className="text-xs opacity-80">
              {isOnline ? (
                <span className="flex items-center">
                  <span className="h-2 w-2 bg-green-400 rounded-full inline-block mr-1"></span>
                  En ligne
                </span>
              ) : (
                lastActivity
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleExpand} 
            className="text-white hover:bg-teal-700 p-1 rounded"
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button 
            onClick={onClose} 
            className="text-white hover:bg-teal-700 p-1 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Zone des messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-4">
            <p>Aucun message. Commencez la conversation !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[70%] p-3 rounded-lg ${
                    message.sender_id === user?.id 
                      ? 'bg-teal-600 text-white rounded-br-none' 
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  {message.has_attachment ? (
                    message.content.startsWith('[IMAGE]') ? (
                      <div>
                        <img 
                          src={message.content.replace('[IMAGE]', '')} 
                          alt="Image jointe" 
                          className="max-w-full rounded-md mb-2" 
                          onLoad={scrollToBottom}
                        />
                      </div>
                    ) : message.content.startsWith('[FICHIER]') ? (
                      <div className="flex items-center">
                        <File className="h-5 w-5 mr-2" />
                        <a 
                          href={message.content.split('|')[1]} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm underline"
                        >
                          {message.content.split('|')[0].replace('[FICHIER]', '')}
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                  <span className={`text-xs mt-1 block ${
                    message.sender_id === user?.id ? 'text-teal-100' : 'text-gray-500'
                  }`}>
                    {formatTime(message.created_at)}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Bouton de création d'offre (visible uniquement pour les prestataires) */}
      {user?.user_metadata?.role === 'provider' && (
        <ChatOfferButton 
          recipientId={recipientId} 
          onOfferSent={(message) => {
            // Envoyer un message automatique après création de l'offre
            if (message && conversationId) {
              sendMessage(conversationId, message);
            }
          }} 
        />
      )}
      
      {/* Zone de saisie */}
      <div className="p-3 border-t border-gray-200 bg-white">
        <div className="flex items-center relative">
          <button
            type="button"
            onClick={handleAttachmentClick}
            className="p-2 text-gray-500 hover:text-teal-600 focus:outline-none"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          
          {/* Menu de pièces jointes */}
          {showAttachmentMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-white rounded-md shadow-lg p-2 z-10">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect} 
                className="hidden" 
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center p-2 hover:bg-gray-100 rounded w-full text-left"
              >
                <Image className="h-4 w-4 mr-2 text-teal-600" />
                <span className="text-sm">Image ou fichier</span>
              </button>
            </div>
          )}
          
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Écrivez votre message..."
            className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !conversationId}
            className={`p-2 rounded-r-md ${
              newMessage.trim() && conversationId
                ? 'bg-teal-600 text-white hover:bg-teal-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Send className="h-5 w-5" />
          </button>
          
          {/* Indicateur de progression */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="absolute top-full left-0 right-0 mt-1">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-teal-600 h-2 rounded-full" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatDialog;