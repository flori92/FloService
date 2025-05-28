import React from 'react';
import { X, Download, Send } from 'lucide-react';

interface ViewInvoiceModalProps {
  invoice: {
    id: string;
    invoice_number: string;
    created_at: string;
    amount: number;
    tax_rate: number;
    tax_amount: number;
    commission: number;
    total_amount: number;
    invoice_url: string;
    provider_details: {
      full_name: string;
      business_name?: string;
      email: string;
      phone?: string;
      address?: string;
    };
    client_details: {
      full_name: string;
      email: string;
      phone?: string;
      address?: string;
    };
  };
  onClose: () => void;
  onSendEmail: () => void;
}

const ViewInvoiceModal: React.FC<ViewInvoiceModalProps> = ({ 
  invoice, 
  onClose,
  onSendEmail
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Facture #{invoice.invoice_number}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <div className="flex justify-between mb-8">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Prestataire</h3>
                <p className="text-gray-600">{invoice.provider_details.business_name || invoice.provider_details.full_name}</p>
                <p className="text-gray-600">{invoice.provider_details.email}</p>
                {invoice.provider_details.phone && <p className="text-gray-600">{invoice.provider_details.phone}</p>}
                {invoice.provider_details.address && <p className="text-gray-600">{invoice.provider_details.address}</p>}
              </div>
              
              <div className="text-right">
                <h3 className="font-semibold text-gray-700 mb-2">Client</h3>
                <p className="text-gray-600">{invoice.client_details.full_name}</p>
                <p className="text-gray-600">{invoice.client_details.email}</p>
                {invoice.client_details.phone && <p className="text-gray-600">{invoice.client_details.phone}</p>}
                {invoice.client_details.address && <p className="text-gray-600">{invoice.client_details.address}</p>}
              </div>
            </div>
            
            <div className="mb-8">
              <h3 className="font-semibold text-gray-700 mb-4">Détails de la facture</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="font-medium">Date</span>
                  <span>{new Date(invoice.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="font-medium">Prestation de service</span>
                  <span>{invoice.amount} FCFA</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="font-medium">TVA ({invoice.tax_rate}%)</span>
                  <span>{invoice.tax_amount} FCFA</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="font-medium">Commission FloService</span>
                  <span>{invoice.commission} FCFA</span>
                </div>
                <div className="flex justify-between py-2 font-bold text-lg">
                  <span>Total</span>
                  <span>{invoice.total_amount} FCFA</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between">
              <a 
                href={invoice.invoice_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger le PDF
              </a>
              
              <button
                onClick={onSendEmail}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Send className="h-4 w-4 mr-2" />
                Envoyer par email
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewInvoiceModal;
