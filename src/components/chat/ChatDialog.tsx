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
  
  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Effet pour charger les messages
  useEffect(() => {
    if (user && recipientId) {
      fetchMessages();
      
      // Abonnement aux nouveaux messages
      const subscription = supabase
        .channel('messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        }, (payload) => {
          // Ajouter le nouveau message s'il provient du destinataire actuel
          if (payload.new && payload.new.sender_id === recipientId) {
            setMessages(prev => [...prev, payload.new as Message]);
            scrollToBottom();
          }
        })
        .subscribe();
        
      return () => {
        subscription.unsubscribe();
      };
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
  
  const fetchLastActivity = async () => {
    // Accepter tous les formats d'ID, y compris les ID de test comme "tg-2"
    if (!recipientId) {
      console.log('ID de destinataire manquant');
      return;
    }
    
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
  
  const fetchMessages = async () => {
    if (!user || !recipientId) return;
    
    // Accepter tous les formats d'ID, y compris les ID de test comme "tg-2"
    if (!recipientId) {
      console.log('ID de destinataire manquant');
      return;
    }
    
    setLoading(true);
    try {
      // Vérifier d'abord si la table messages existe
      const { error: tableCheckError } = await supabase
        .from('messages')
        .select('count(*)', { count: 'exact', head: true });
      
      // Si la table n'existe pas encore (migration non appliquée), on sort silencieusement
      if (tableCheckError) {
        console.log('La table messages n\'existe pas encore, migration probablement non appliquée');
        setLoading(false);
        return;
      }
      
      // Utiliser une approche plus robuste pour la requête
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Erreur lors du chargement des messages:', error);
        setLoading(false);
        return;
      }
      
      if (data) {
        setMessages(data);
        
        // Marquer les messages comme lus
        const unreadMessages = data.filter(msg => 
          msg.recipient_id === user.id && !msg.read
        );
        
        if (unreadMessages.length > 0) {
          try {
            await supabase
              .from('messages')
              .update({ read: true })
              .in('id', unreadMessages.map(msg => msg.id));
          } catch (updateError) {
            console.error('Erreur lors de la mise à jour des messages lus:', updateError);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    } finally {
      setLoading(false);
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
    if (!user || !recipientId) return;
    
    try {
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
      
      // Télécharger le fichier
      const { error } = await supabase.storage
        .from('attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        throw error;
      }
      
      // Simuler la progression du téléchargement
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
        }
      }, 100);
      
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
      
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          content: attachmentContent,
          read: false,
          has_attachment: true
        })
        .select();
      
      if (messageError) {
        throw messageError;
      }
      
      if (messageData && messageData.length > 0) {
        setMessages(prev => [...prev, messageData[0]]);
        scrollToBottom();
      }
      
      setUploadProgress(0);
      toast.success('Fichier envoyé avec succès');
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi du fichier:', error);
      toast.error('Impossible d\'envoyer le fichier');
      setUploadProgress(0);
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
  
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !recipientId) return;
    
    // Accepter tous les formats d'ID, y compris les ID de test comme "tg-2"
    
    try {
      // Vérifier d'abord si la table messages existe
      const { error: tableCheckError } = await supabase
        .from('messages')
        .select('count(*)', { count: 'exact', head: true });
      
      // Si la table n'existe pas encore (migration non appliquée), afficher un message d'erreur
      if (tableCheckError) {
        console.log('La table messages n\'existe pas encore, migration probablement non appliquée');
        toast.error('Le système de messagerie n\'est pas encore disponible');
        return;
      }
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          content: newMessage.trim(),
          read: false,
          has_attachment: false
        })
        .select();
      
      if (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        toast.error('Impossible d\'envoyer le message');
        return;
      }
      
      if (data && data.length > 0) {
        // Ajouter le message à la liste locale
        setMessages(prev => [...prev, data[0]]);
        setNewMessage('');
        scrollToBottom();
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      toast.error('Impossible d\'envoyer le message');
    }
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
                  <p className={`text-xs mt-1 ${
                    message.sender_id === user?.id ? 'text-teal-100' : 'text-gray-500'
                  }`}>
                    {formatTime(message.created_at)}
                  </p>
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
            if (message) {
              setNewMessage(message);
              handleSendMessage();
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
            disabled={!newMessage.trim()}
            className={`p-2 rounded-r-md ${
              newMessage.trim() 
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
