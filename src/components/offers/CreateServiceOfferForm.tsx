import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

interface CreateServiceOfferFormProps {
  clientId: string;
  serviceId?: string;
  onOfferCreated?: () => void;
}

export const CreateServiceOfferForm: React.FC<CreateServiceOfferFormProps> = ({
  clientId,
  serviceId,
  onOfferCreated
}) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    description: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Vous devez être connecté pour créer une offre');
      return;
    }
    
    setLoading(true);

    try {
      // 1. Créer l'offre dans Supabase
      const { data: offer, error } = await supabase
        .from('service_offers')
        .insert({
          provider_id: user.id,
          client_id: clientId,
          service_id: serviceId,
          amount: parseInt(form.amount, 10),
          description: form.description,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 jours
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Générer le lien de paiement via Edge Function
      const { data: paymentLink, error: paymentLinkError } = await supabase
        .functions.invoke('generate_payment_link', {
          body: {
            offer_id: offer.id,
            amount: parseInt(form.amount, 10),
            description: form.description || `Prestation de service - ${serviceId || 'Personnalisée'}`
          }
        });

      if (paymentLinkError) throw paymentLinkError;

      // 3. Mettre à jour l'offre avec le lien de paiement
      await supabase
        .from('service_offers')
        .update({
          payment_link: paymentLink.url,
          payment_link_id: paymentLink.id
        })
        .eq('id', offer.id);

      // 4. Notifier le client (via notification in-app)
      await supabase
        .from('notifications')
        .insert({
          user_id: clientId,
          type: 'offer',
          title: 'Nouvelle offre de service',
          content: `Vous avez reçu une offre de service pour ${form.amount} FCFA`,
          data: { offer_id: offer.id, payment_link: paymentLink.url }
        });

      toast.success('Offre envoyée au client avec succès !');
      setForm({ amount: '', description: '' });
      onOfferCreated && onOfferCreated();
    } catch (error) {
      console.error('Erreur lors de la création de l\'offre:', error);
      toast.error('Impossible de créer l\'offre. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
          Montant (FCFA)
        </label>
        <input
          type="number"
          id="amount"
          name="amount"
          value={form.amount}
          onChange={handleChange}
          required
          min="100"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description de la prestation
        </label>
        <textarea
          id="description"
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
      >
        {loading ? 'Envoi en cours...' : 'Envoyer l\'offre au client'}
      </button>
    </form>
  );
};

export default CreateServiceOfferForm;
