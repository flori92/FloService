import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Paperclip, Image as ImageIcon, File } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface MessageDialogProps {
  conversationId: string;
  providerName: string;
  onClose: () => void;
  isOnline?: boolean;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  file_url?: string;
  file_type?: string;
}

export const MessageDialog: React.FC<MessageDialogProps> = ({
  conversationId,
  providerName,
  onClose,
  isOnline = false
}) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [subject, setSubject] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    loadMessages();
    const subscription = subscribeToMessages();
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Erreur lors du chargement des messages');
    }
  };

  const subscribeToMessages = () => {
    return supabase
      .channel('messages')
      .on('INSERT', { event: '*', schema: 'public', table: 'messages' }, 
        payload => {
          if (payload.new.conversation_id === conversationId) {
            setMessages(prev => [...prev, payload.new as Message]);
          }
        }
      )
      .subscribe();
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${conversationId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(filePath);

      await sendMessage('', publicUrl, file.type);
      toast.success('Fichier envoyé avec succès');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Erreur lors de l\'envoi du fichier');
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async (content: string, fileUrl?: string, fileType?: string) => {
    try {
      setLoading(true);
      const messageData = {
        conversation_id: conversationId,
        sender_id: user?.id,
        content: content || '',
        file_url: fileUrl,
        file_type: fileType
      };

      const { error } = await supabase
        .from('messages')
        .insert([messageData]);

      if (error) throw error;

      setMessage('');
      toast.success('Message envoyé');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !fileInputRef.current?.files?.length) return;

    if (fileInputRef.current?.files?.length) {
      await handleFileUpload(fileInputRef.current.files[0]);
    } else {
      await sendMessage(message);
    }
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
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  msg.sender_id === user?.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {msg.file_url ? (
                  msg.file_type?.startsWith('image/') ? (
                    <img
                      src={msg.file_url}
                      alt="Image"
                      className="max-w-full rounded-lg"
                    />
                  ) : (
                    <a
                      href={msg.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-blue-500 hover:text-blue-600"
                    >
                      <File className="w-4 h-4" />
                      <span>Voir le fichier</span>
                    </a>
                  )
                ) : (
                  <p>{msg.content}</p>
                )}
                <span className="text-xs opacity-75 mt-1 block">
                  {new Date(msg.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Objet (optionnel)"
            className="w-full mb-2 p-2 border rounded-lg"
          />
          <div className="flex space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-gray-700"
              disabled={uploading}
            >
              <Paperclip className="w-6 h-6" />
            </button>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Votre message..."
              className="flex-1 p-2 border rounded-lg"
              disabled={loading || uploading}
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading || uploading || (!message.trim() && !fileInputRef.current?.files?.length)}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};