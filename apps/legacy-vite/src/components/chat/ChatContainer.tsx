import React from 'react';
import { useChat } from '../../contexts/ChatContext';
import ChatDialog from './ChatDialog';

const ChatContainer: React.FC = () => {
  const { activeChats, closeChat } = useChat();
  
  return (
    <div className="chat-container">
      {activeChats.map(chat => (
        <ChatDialog
          key={chat.id}
          recipientId={chat.id}
          recipientName={chat.name}
          isOnline={chat.isOnline}
          initialPosition={chat.position}
          onClose={() => closeChat(chat.id)}
        />
      ))}
    </div>
  );
};

export default ChatContainer;
