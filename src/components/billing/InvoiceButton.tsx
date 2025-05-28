import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import InvoiceGenerator from './InvoiceGenerator';

interface InvoiceButtonProps {
  paymentId?: string;
  offerId?: string;
  className?: string;
}

const InvoiceButton: React.FC<InvoiceButtonProps> = ({ 
  paymentId, 
  offerId,
  className = ''
}) => {
  const [showInvoice, setShowInvoice] = useState(false);

  return (
    <div>
      <button
        onClick={() => setShowInvoice(!showInvoice)}
        className={`flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${className}`}
      >
        <FileText className="h-4 w-4 mr-2" />
        {showInvoice ? 'Masquer la facture' : 'Générer une facture'}
      </button>

      {showInvoice && (
        <div className="mt-4">
          <InvoiceGenerator 
            paymentId={paymentId} 
            offerId={offerId} 
            onInvoiceGenerated={(url) => {
              // Optionnel : ouvrir la facture dans un nouvel onglet
              window.open(url, '_blank');
            }}
          />
        </div>
      )}
    </div>
  );
};

export default InvoiceButton;
