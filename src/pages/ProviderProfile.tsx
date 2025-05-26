import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, MapPin, Globe, Award } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Chat from '../components/Chat';
import { serviceProviders } from '../data/providers';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const ProviderProfile: React.FC = () => {
  const { id: rawId } = useParams<{ id: string }>();
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Clean the ID to remove ':1' suffix if present
  const id = rawId?.split(':')[0];

  const provider = serviceProviders.find(p => p.id === id);

  if (!provider) {
    return <div>Prestataire non trouvé</div>;
  }

  const handleContact = async () => {
    if (!user) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/provider/${id}`);
      return;
    }

    try {
      setLoading(true);

      // Check if a conversation already exists
      const { data: existingConversation, error: fetchError } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', user.id)
        .eq('provider_id', id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw fetchError;
      }

      if (existingConversation) {
        setShowChat(true);
        return;
      }

      // Create a new conversation
      const { data: newConversation, error: insertError } = await supabase
        .from('conversations')
        .insert({
          client_id: user.id,
          provider_id: id
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      setShowChat(true);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Une erreur est survenue lors de la création de la conversation');
    } finally {
      setLoading(false);
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

                  <button
                    onClick={handleContact}
                    disabled={loading}
                    className="w-full mt-6 bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Chargement...' : 'Contacter'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {showChat && id && <Chat providerId={id} onClose={() => setShowChat(false)} />}
      <Footer />
    </div>
  );
};

export default ProviderProfile;