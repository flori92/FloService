import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import Chat from '../components/Chat';

interface Conversation {
  id: string;
  provider_id: string;
  client_id: string;
  last_message?: string;
  last_message_time?: string;
  provider_name?: string;
  provider_avatar?: string;
}

const Messages: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    loadConversations();
  }, [user, navigate]);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          provider:provider_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .or(`client_id.eq.${user?.id},provider_id.eq.${user?.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
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
              <div className="p-4 border-b">
                <h2 className="text-xl font-semibold">Messages</h2>
              </div>
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
                        src={conversation.provider_avatar || 'https://via.placeholder.com/40'}
                        alt={conversation.provider_name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <h3 className="font-medium">{conversation.provider_name}</h3>
                        <p className="text-sm text-gray-500 truncate">
                          {conversation.last_message || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Area */}
            <div className="col-span-2 lg:col-span-3 h-[600px]">
              {selectedConversation ? (
                <Chat
                  providerId={selectedConversation}
                  onClose={() => setSelectedConversation(null)}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  Select a conversation to start messaging
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