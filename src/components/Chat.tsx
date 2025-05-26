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
  providerId: string;
  onClose: () => void;
}

const Chat: React.FC<ChatProps> = ({ providerId, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (!user) return;
    
    // Subscribe to new messages
    const subscription = supabase
      .channel('messages')
      .on('INSERT', { event: '*', schema: 'public', table: 'messages' }, 
        payload => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    // Load existing messages
    loadMessages();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, providerId]);

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
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      toast.error('Error loading messages');
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
        receiver_id: providerId,
        content,
        file_url: fileUrl,
        file_type: fileType,
        conversation_id: providerId // Using providerId as conversation_id for now
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

  return (
    <div className="fixed bottom-0 right-4 w-96 h-[600px] bg-white rounded-t-lg shadow-xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center bg-teal-600 rounded-t-lg">
        <h3 className="text-lg font-semibold text-white">Chat</h3>
        <button onClick={onClose} className="text-white hover:text-gray-200">
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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