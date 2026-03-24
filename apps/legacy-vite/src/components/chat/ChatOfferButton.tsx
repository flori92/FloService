import React, { useState } from 'react';
import CreateServiceOfferForm from '../offers/CreateServiceOfferForm';

interface ChatOfferButtonProps {
  recipientId: string;
  onOfferSent?: (message: string) => void;
}

export const ChatOfferButton: React.FC<ChatOfferButtonProps> = ({ recipientId, onOfferSent }) => {
  const [showOfferForm, setShowOfferForm] = useState(false);

  const handleOfferCreated = () => {
    setShowOfferForm(false);
    if (onOfferSent) {
      onOfferSent("J'ai créé une offre de service pour vous. Vous pouvez la consulter dans votre espace client.");
    }
  };

  return (
    <div className="mb-4">
      <button 
        onClick={() => setShowOfferForm(!showOfferForm)}
        className="text-teal-600 hover:text-teal-700 flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
        {showOfferForm ? 'Annuler' : 'Proposer une offre'}
      </button>

      {showOfferForm && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Créer une offre pour ce client</h3>
          <CreateServiceOfferForm 
            clientId={recipientId}
            onOfferCreated={handleOfferCreated}
          />
        </div>
      )}
    </div>
  );
};

export default ChatOfferButton;
