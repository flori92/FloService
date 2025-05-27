import React from 'react';
import { MessageCircle } from 'lucide-react';

interface ChatButtonProps {
  onClick: () => void;
  variant?: 'primary' | 'outline' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ChatButton: React.FC<ChatButtonProps> = ({
  onClick,
  variant = 'primary',
  size = 'md',
  className = ''
}) => {
  const baseClasses = 'flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500';
  
  const variantClasses = {
    primary: 'bg-teal-600 hover:bg-teal-700 text-white',
    outline: 'border border-teal-600 text-teal-600 hover:bg-teal-50',
    icon: 'text-teal-600 hover:bg-teal-50 rounded-full'
  };
  
  const sizeClasses = {
    sm: variant === 'icon' ? 'p-1.5' : 'px-3 py-1.5 text-sm rounded-md',
    md: variant === 'icon' ? 'p-2' : 'px-4 py-2 rounded-md',
    lg: variant === 'icon' ? 'p-3' : 'px-6 py-3 rounded-lg'
  };
  
  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      <MessageCircle className={`${variant !== 'icon' ? 'mr-2' : ''} ${
        size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6'
      }`} />
      {variant !== 'icon' && <span>Contacter</span>}
    </button>
  );
};

export default ChatButton;
