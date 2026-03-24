import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { FileText, Download, Send } from 'lucide-react';
import toast from 'react-hot-toast';

interface InvoiceGeneratorProps {
  paymentId?: string;
  offerId?: string;
  onInvoiceGenerated?: (invoiceUrl: string) => void;
}

interface InvoiceData {
  id: string;
  created_at: string;
  payment_id?: string;
  offer_id?: string;
  provider_id: string;
  client_id: string;
  amount: number;
  commission: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'paid';
  invoice_number: string;
  invoice_url?: string;
  provider_details?: any;
  client_details?: any;
}

const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({ 
  paymentId, 
  offerId,
  onInvoiceGenerated 
}) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);

  // Générer une facture automatiquement
  const generateInvoice = async () => {
    if (!user) {
      toast.error('Vous devez être connecté pour générer une facture');
      return;
    }

    if (!paymentId && !offerId) {
      toast.error('Aucun paiement ou offre spécifié pour la facturation');
      return;
    }

    setLoading(true);

    try {
      // 1. Récupérer les données du paiement ou de l'offre
      let paymentData;
      let offerData;
      
      if (paymentId) {
        const { data, error } = await supabase
          .from('payments')
          .select(`
            *,
            provider:provider_id(id, full_name, business_name, email, phone, address),
            client:client_id(id, full_name, email, phone, address)
          `)
          .eq('id', paymentId)
          .single();
          
        if (error) throw error;
        paymentData = data;
      } else if (offerId) {
        const { data, error } = await supabase
          .from('service_offers')
          .select(`
            *,
            provider:provider_id(id, full_name, business_name, email, phone, address),
            client:client_id(id, full_name, email, phone, address)
          `)
          .eq('id', offerId)
          .single();
          
        if (error) throw error;
        offerData = data;
      }

      const sourceData = paymentData || offerData;
      if (!sourceData) throw new Error('Données introuvables');

      // 2. Calculer les montants (TVA, commission, etc.)
      const amount = sourceData.amount;
      const commission = 100; // Commission fixe de 100 FCFA
      const taxRate = 18; // TVA à 18%
      const taxAmount = Math.round((amount * taxRate) / 100);
      const totalAmount = amount + taxAmount;

      // 3. Générer un numéro de facture unique
      const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

      // 4. Créer l'entrée de facture dans la base de données
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          payment_id: paymentId,
          offer_id: offerId,
          provider_id: sourceData.provider_id,
          client_id: sourceData.client_id,
          amount: amount,
          commission: commission,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          status: 'draft',
          invoice_number: invoiceNumber,
          provider_details: sourceData.provider,
          client_details: sourceData.client
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // 5. Générer le PDF de facture via une fonction Edge
      const { data: pdfData, error: pdfError } = await supabase
        .functions.invoke('generate_invoice_pdf', {
          body: { invoice_id: invoiceData.id }
        });

      if (pdfError) throw pdfError;

      // 6. Mettre à jour l'entrée de facture avec l'URL du PDF
      const { data: updatedInvoice, error: updateError } = await supabase
        .from('invoices')
        .update({ invoice_url: pdfData.url })
        .eq('id', invoiceData.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setInvoice(updatedInvoice);
      toast.success('Facture générée avec succès');
      
      if (onInvoiceGenerated) {
        onInvoiceGenerated(pdfData.url);
      }
    } catch (error) {
      console.error('Erreur lors de la génération de la facture:', error);
      toast.error('Impossible de générer la facture');
    } finally {
      setLoading(false);
    }
  };

  // Envoyer la facture par email
  const sendInvoiceByEmail = async () => {
    if (!invoice) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase
        .functions.invoke('send_invoice_email', {
          body: { invoice_id: invoice.id }
        });
        
      if (error) throw error;
      
      // Mettre à jour le statut de la facture
      await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoice.id);
        
      toast.success('Facture envoyée par email avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la facture:', error);
      toast.error('Impossible d\'envoyer la facture par email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center mb-4">
        <FileText className="h-6 w-6 text-teal-600 mr-2" />
        <h2 className="text-xl font-semibold">Facturation</h2>
      </div>
      
      {!invoice ? (
        <div>
          <p className="text-gray-600 mb-4">
            Générez automatiquement une facture pour ce service avec tous les détails nécessaires.
          </p>
          <button
            onClick={generateInvoice}
            disabled={loading}
            className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 transition-colors flex items-center"
          >
            {loading ? (
              <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Génération en cours...' : 'Générer la facture'}
          </button>
        </div>
      ) : (
        <div>
          <div className="bg-gray-50 p-4 rounded-md mb-4">
            <div className="flex justify-between mb-2">
              <span className="font-medium">N° de facture:</span>
              <span>{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="font-medium">Date:</span>
              <span>{new Date(invoice.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="font-medium">Montant HT:</span>
              <span>{invoice.amount} FCFA</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="font-medium">TVA ({invoice.tax_rate}%):</span>
              <span>{invoice.tax_amount} FCFA</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="font-medium">Commission:</span>
              <span>{invoice.commission} FCFA</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span>{invoice.total_amount} FCFA</span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <a
              href={invoice.invoice_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </a>
            <button
              onClick={sendInvoiceByEmail}
              disabled={loading || invoice.status === 'sent'}
              className={`px-4 py-2 rounded-md flex items-center ${
                loading || invoice.status === 'sent'
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700 transition-colors'
              }`}
            >
              <Send className="h-4 w-4 mr-2" />
              {invoice.status === 'sent' ? 'Facture envoyée' : 'Envoyer par email'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceGenerator;
