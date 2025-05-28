import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

interface ServiceOffer {
  id: string;
  provider_id: string;
  amount: number;
  description: string;
  status: string;
  payment_link: string;
  created_at: string;
  expires_at: string;
  provider: {
    full_name: string;
    business_name: string;
    avatar_url: string;
  };
}

export const ClientOffersList: React.FC = () => {
  const { user } = useAuthStore();
  const [offers, setOffers] = useState<ServiceOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOffers();
      
      // Abonnement aux changements en temps réel
      const channel = supabase.channel('service_offers_changes')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'service_offers' }, 
            (payload: { new: { client_id: string } }) => {
              if (payload.new.client_id === user.id) {
                fetchOffers();
                toast.success('Vous avez reçu une nouvelle offre de service !');
              }
            })
        .on('postgres_changes', 
            { event: 'UPDATE', schema: 'public', table: 'service_offers' }, 
            (payload: { new: { client_id: string } }) => {
              if (payload.new.client_id === user.id) {
                fetchOffers();
              }
            })
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchOffers = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('service_offers')
      .select(`
        *,
        provider:provider_id(full_name, business_name, avatar_url)
      `)
      .eq('client_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setOffers(data as ServiceOffer[]);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Offres de services reçues</h2>
      
      {loading ? (
        <div className="animate-pulse">Chargement des offres...</div>
      ) : offers.length === 0 ? (
        <div className="text-gray-500">Aucune offre de service pour le moment.</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {offers.map(offer => (
            <div 
              key={offer.id} 
              className={`border rounded-lg overflow-hidden shadow-sm ${
                offer.status === 'pending' ? 'border-yellow-400' : 
                offer.status === 'paid' ? 'border-green-400' : 'border-gray-200'
              }`}
            >
              <div className="p-4 flex items-center space-x-4">
                <img 
                  src={offer.provider.avatar_url || 'https://via.placeholder.com/40'} 
                  alt={offer.provider.business_name || offer.provider.full_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-medium">
                    {offer.provider.business_name || offer.provider.full_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Offre créée le {new Date(offer.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="p-4 border-t border-gray-100">
                <div className="flex justify-between mb-2">
                  <span className="font-bold text-xl">{offer.amount} FCFA</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                    offer.status === 'paid' ? 'bg-green-100 text-green-800' : 
                    offer.status === 'expired' ? 'bg-gray-100 text-gray-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {offer.status === 'pending' ? 'En attente' : 
                     offer.status === 'paid' ? 'Payé' : 
                     offer.status === 'expired' ? 'Expirée' : 'Annulée'}
                  </span>
                </div>
                
                {offer.description && (
                  <p className="text-gray-700 mb-4">{offer.description}</p>
                )}
                
                {offer.status === 'pending' && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-2">
                      Cette offre expire le {new Date(offer.expires_at).toLocaleDateString()}
                    </p>
                    <a 
                      href={offer.payment_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block w-full text-center py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-md transition-colors"
                    >
                      Payer maintenant
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientOffersList;
