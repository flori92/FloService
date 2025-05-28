import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, MapPin, Globe, Award } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { serviceProviders } from '../data/providers';
import { useAuthStore } from '../store/authStore';
import { useChat } from '../contexts/ChatContext';
import ChatButton from '../components/chat/ChatButton';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const ProviderProfile: React.FC = () => {
  const { id: rawId } = useParams<{ id: string }>();
  const cleanedProviderId = rawId?.split(':')[0];

  const [providerData, setProviderData] = useState<any>(null);
  const { user } = useAuthStore();
  const { openChat } = useChat();
  const navigate = useNavigate();

  const provider = serviceProviders.find(p => p.id === cleanedProviderId);
  
  // Effet pour charger les données du prestataire depuis Supabase
  useEffect(() => {
    if (cleanedProviderId) {
      fetchProviderData();
    }
  }, [cleanedProviderId]);

  // Fonction pour récupérer les données du prestataire depuis Supabase
  const fetchProviderData = async () => {
    // Accepter tous les formats d'ID, y compris les ID de test comme "tg-2"
    if (!cleanedProviderId) {
      console.log('ID de prestataire manquant');
      return;
    }
    
    try {
      // Vérifier d'abord si la table provider_profiles existe
      const { error: tableCheckError } = await supabase
        .from('provider_profiles')
        .select('count(*)', { count: 'exact', head: true });
      
      // Si la table n'existe pas, on fait une requête plus simple
      const hasProviderProfilesTable = !tableCheckError;
      
      const query = hasProviderProfilesTable
        ? supabase
            .from('profiles')
            .select('*, provider_profiles(*)')
            .eq('id', cleanedProviderId)
            .single()
        : supabase
            .from('profiles')
            .select('*')
            .eq('id', cleanedProviderId)
            .single();
      
      const { data, error } = await query;

      if (error) {
        console.error('Erreur lors de la récupération du profil prestataire:', error);
        return;
      }

      if (data) {
        setProviderData(data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du profil prestataire:', error);
    }
  };

  if (!provider) {
    return <div className="container mx-auto px-4 py-24 text-center">Prestataire non trouvé</div>;
  }

  const handleContact = () => {
    if (!user) {
      navigate(`/login?redirect=/provider/${rawId}`);
      return;
    }

    if (!cleanedProviderId) {
      toast.error('Identifiant du prestataire invalide');
      return;
    }

    try {
      // Vérifier si nous avons les données du prestataire depuis Supabase
      const providerName = providerData?.full_name || provider.name;
      const isProviderOnline = providerData?.is_online || false;
      
      // Utiliser le nouveau système de chat pour ouvrir une conversation
      openChat(cleanedProviderId, providerName, isProviderOnline);
      
      // Notification de succès
      toast.success(`Conversation ouverte avec ${providerName}`);
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de la conversation:', error);
      toast.error('Une erreur est survenue lors de l\'ouverture de la conversation');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-24">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="relative h-64 bg-gradient-to-r from-teal-500 to-blue-500">
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/50 to-transparent">
              <div className="flex items-center space-x-6">
                <img
                  src={provider.avatar}
                  alt={provider.name}
                  className="w-32 h-32 rounded-full border-4 border-white object-cover"
                />
                <div className="text-white">
                  <h1 className="text-3xl font-bold">{provider.name}</h1>
                  <p className="text-xl opacity-90">{provider.profession}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Left Column */}
              <div className="md:col-span-2">
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">À propos</h2>
                  <p className="text-gray-600">{provider.description}</p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Portfolio</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {provider.portfolio.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`Portfolio ${index + 1}`}
                        className="rounded-lg object-cover w-full h-48"
                      />
                    ))}
                  </div>
                </section>
              </div>

              {/* Right Column */}
              <div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="mb-6">
                    <div className="flex items-center mb-2">
                      <Star className="w-5 h-5 text-yellow-400 fill-current" />
                      <span className="ml-2 font-semibold">
                        {provider.rating} ({provider.reviews} avis)
                      </span>
                    </div>
                    <div className="flex items-center mb-2">
                      <MapPin className="w-5 h-5 text-gray-500" />
                      <span className="ml-2">{provider.city}</span>
                    </div>
                    <div className="flex items-center mb-2">
                      <Globe className="w-5 h-5 text-gray-500" />
                      <span className="ml-2">
                        {provider.languages.join(', ')}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Award className="w-5 h-5 text-gray-500" />
                      <span className="ml-2">
                        Membre depuis {provider.memberSince}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">Spécialités</h3>
                    <div className="flex flex-wrap gap-2">
                      {provider.specialties.map((specialty, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>

                  <ChatButton
                    onClick={handleContact}
                    variant="primary"
                    size="lg"
                    className="w-full mt-6"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProviderProfile;