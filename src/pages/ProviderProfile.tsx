import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Star, MapPin, Clock, Phone, Mail, Award, Globe } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuthStore } from '../store/authStore';
import { useChat } from '../contexts/ChatContext';
import ChatButton from '../components/chat/ChatButton';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { isValidUUID } from '../utils/validation';
import { fetchProviderData as fetchProviderDataHelper } from '../utils/supabaseHelpers';

interface ProviderProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  business_name?: string;
  bio?: string;
  is_provider: boolean;
  role?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  provider_profiles?: {
    specialization?: string;
    experience_years?: number;
    hourly_rate?: number;
    availability?: string[];
    rating?: number;
    reviews_count?: number;
  };
}

const defaultProfile: ProviderProfile = {
  id: '',
  full_name: 'Utilisateur',
  is_provider: true,
  avatar_url: '',
  bio: '',
  city: ''
};

const ProviderProfile: React.FC = () => {
  const { id: rawId } = useParams<{ id: string }>();
  const cleanedProviderId = rawId?.split(':')[0];

  const [providerData, setProviderData] = useState<ProviderProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const { user } = useAuthStore();
  const { openChat } = useChat();
  const navigate = useNavigate();
  
  // Fonction utilitaire pour créer un profil sécurisé à partir des données
  const createSafeProfileFromData = (data: any, includeProviderProfiles = false): ProviderProfile => {
    // Si data n'est pas un objet valide, retourner le profil par défaut
    if (!data || typeof data !== 'object' || ('error' in data)) {
      return defaultProfile;
    }

    // Construire un profil sécurisé avec des valeurs par défaut
    const safeProfile: ProviderProfile = {
      ...defaultProfile,
      id: 'id' in data ? String(data.id || defaultProfile.id) : defaultProfile.id,
      full_name: 'full_name' in data ? String(data.full_name || defaultProfile.full_name) : defaultProfile.full_name,
      avatar_url: 'avatar_url' in data ? String(data.avatar_url || '') : '',
      bio: 'bio' in data ? String(data.bio || '') : '',
      city: 'city' in data ? String(data.city || '') : '',
      is_provider: defaultProfile.is_provider
    };

    // Ajouter les champs optionnels s'ils existent
    if ('business_name' in data && data.business_name) {
      safeProfile.business_name = String(data.business_name);
    }

    if ('role' in data && data.role) {
      safeProfile.role = String(data.role);
    }

    // Ajouter provider_profiles si nécessaire
    if (includeProviderProfiles && 'provider_profiles' in data) {
      safeProfile.provider_profiles = data.provider_profiles;
    }

    return safeProfile;
  };

  // Fonction pour récupérer les données du prestataire - complètement refactorisée
  const loadProviderData = async () => {
    if (!cleanedProviderId) {
      setError('Identifiant du prestataire manquant');
      setLoading(false);
      return;
    }

    try {
      // Vérification de la validité de l'UUID avec exception pour les ID de test
      const isTestId = cleanedProviderId.startsWith('tg-');
      if (!isValidUUID(cleanedProviderId) && !isTestId) {
        console.error('ID de prestataire invalide:', cleanedProviderId);
        toast.error('Identifiant de prestataire invalide');
        setError('Identifiant de prestataire invalide');
        setLoading(false);
        return;
      }

      // Vérifier d'abord si l'utilisateur est un prestataire
      const { data: isProviderData, error: isProviderError } = await supabase
        .rpc('is_provider', { user_id: cleanedProviderId })
        .single();

      if (isProviderError) {
        // Gestion des erreurs spécifiques
        if (isProviderError.code === '406') {
          console.error('Erreur 406 Not Acceptable - Format de requête incorrect:', isProviderError);
          toast.error('Erreur de format de requête. Vérifiez les en-têtes HTTP.');
          setMigrationRequired(true);
        } else if (isProviderError.code === '400') {
          console.error('Erreur 400 Bad Request - Paramètres invalides:', isProviderError);
          toast.error('Paramètres de requête invalides. Contactez l\'administrateur.');
          setMigrationRequired(true);
        } else if (isProviderError.code === '42P01') { // Table inexistante
          console.error('Table manquante, migrations requises:', isProviderError);
          toast.error('La base de données nécessite des migrations. Contactez l\'administrateur.');
          setMigrationRequired(true);
        } else {
          console.error('Erreur lors de la vérification du statut prestataire:', isProviderError);
          toast.error('Erreur lors de la vérification du statut prestataire');
        }
        
        // Fallback: utiliser les données par défaut
        setProviderData(defaultProfile);
      } else {
        // Récupérer les données du profil de base
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', cleanedProviderId)
          .single();

        if (profileError) {
          console.error('Erreur lors de la récupération du profil:', profileError);
          setError('Erreur lors de la récupération des données du prestataire');
          setProviderData(defaultProfile);
        } else {
          // Récupérer les données spécifiques au prestataire
          const { data: providerProfileData, error: providerProfileError } = await supabase
            .from('provider_profiles')
            .select('*')
            .eq('id', cleanedProviderId)
            .single();

          if (providerProfileError) {
            console.error('Erreur lors de la récupération du profil prestataire:', providerProfileError);
            // Utiliser uniquement les données de profil de base
            setProviderData(createSafeProfileFromData(profileData));
          } else {
            // Combiner les données de profil de base et de prestataire
            setProviderData(createSafeProfileFromData(profileData, true));
          }
        }
      }
    } catch (error) {
      console.error('Exception lors de la récupération des données:', error);
      toast.error('Une erreur est survenue lors de la récupération des données');
      setProviderData(defaultProfile);
    } finally {
      setLoading(false);
    }
  };

  // Fonction de fallback pour récupérer les données du prestataire - complètement refactorisée
  const fetchProviderDataFallback = async () => {
    try {
      // Étape 1: Vérification si l'utilisateur est un prestataire
      let isProvider = false;
      try {
        // Vérification si l'utilisateur est un prestataire
        const response = await supabase
          .rpc('is_provider', { user_id: cleanedProviderId })
          .single();
          
        const { data: isProviderData, error: isProviderError } = response;

        if (isProviderError) {
          // Détection des erreurs spécifiques
          if (isProviderError.code === '406') {
            console.error('Erreur 406 Not Acceptable - Format de requête incorrect:', isProviderError);
            toast.error('Erreur de format de requête. Vérifiez les en-têtes HTTP.');
            setMigrationRequired(true);
          } else if (isProviderError.code === '400') {
            console.error('Erreur 400 Bad Request - Paramètres invalides:', isProviderError);
            toast.error('Paramètres de requête invalides. Contactez l\'administrateur.');
            setMigrationRequired(true);
          } else if (isProviderError.code === '42P01') { // Table inexistante
            console.error('Table manquante, migrations requises:', isProviderError);
            toast.error('La base de données nécessite des migrations. Contactez l\'administrateur.');
            setMigrationRequired(true);
          }
        }
        
        if (!isProviderError && isProviderData !== null) {
          isProvider = true;
        }
      } catch (rpcError) {
        console.error('Erreur RPC is_provider:', rpcError);
        // Continuons avec les autres méthodes
      }

      // Étape 2: Récupération des données complètes si c'est un prestataire
      if (isProvider) {
        try {
          const response = await supabase
            .from('profiles')
            .select('*, provider_profiles(*)')
            .eq('id', cleanedProviderId)
            .single();
            
          const { data, error } = response;

          if (!error) {
            // Utilisation de la fonction utilitaire pour créer un profil sécurisé
            const safeProfile = createSafeProfileFromData(data, true); // true pour inclure provider_profiles
            setProviderData(safeProfile);
            return;
          }
        } catch (fullDataError) {
          console.error('Erreur récupération données complètes:', fullDataError);
          // Continuons avec les autres méthodes
        }
      }

      // Étape 3: Récupération des données de base
      try {
        const response = await supabase
          .from('profiles')
          .select('*')
          .eq('id', cleanedProviderId)
          .single();
          
        const { data, error } = response;

        if (!error && data !== null) {
          // Utilisation de la fonction utilitaire pour créer un profil sécurisé
          const safeProfile = createSafeProfileFromData(data);
          setProviderData(safeProfile);
          return;
        } else if (error) {
          // Notification pour informer l'utilisateur que les migrations doivent être appliquées
          if (error.code === '42P01') { // Code pour table inexistante
            setMigrationRequired(true);
            toast.error('La base de données nécessite des migrations. Contactez l\'administrateur.');
            console.error('Table manquante, migrations requises:', error);
          }
        }
      } catch (basicDataError) {
        console.error('Erreur récupération données de base:', basicDataError);
      }

      // Étape 4: Dernier recours - utiliser le profil par défaut
      toast.error('Impossible de récupérer les données du prestataire, utilisation d\'un profil par défaut');
      console.warn('Utilisation du profil par défaut pour le prestataire:', cleanedProviderId);
      setProviderData(defaultProfile);
      toast.error('Profil limité disponible');
    } catch (error) {
      console.error('Exception lors du fallback:', error);
      toast.error('Erreur lors de la récupération des données du prestataire');
    }
  };

  // Effet pour charger les données du prestataire depuis Supabase
  useEffect(() => {
    if (cleanedProviderId) {
      loadProviderData();
    }
  }, [cleanedProviderId]);

  if (loading) {
    return <div className="container mx-auto px-4 py-24 text-center">Chargement des données...</div>;
  }

  if (error || !providerData) {
    return <div className="container mx-auto px-4 py-24 text-center">{error || 'Prestataire non trouvé'}</div>;
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
      // Utiliser les données du prestataire depuis Supabase
      const providerName = providerData?.full_name || 'Prestataire';
      // Nous n'avons pas cette propriété dans notre interface, donc on utilise false par défaut
      const isProviderOnline = false;
      
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
        {migrationRequired && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
            <p className="font-bold">Attention - Migrations requises</p>
            <p>
              Certaines fonctionnalités ne sont pas disponibles car la base de données nécessite des migrations.
              Veuillez contacter l'administrateur du système pour résoudre ce problème.
            </p>
          </div>
        )}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="relative h-64 bg-gradient-to-r from-teal-500 to-blue-500">
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/50 to-transparent">
              <div className="flex items-center space-x-6">
                <img
                  src={providerData.avatar_url || '/default-avatar.png'}
                  alt={providerData.full_name}
                  className="w-32 h-32 rounded-full border-4 border-white object-cover"
                />
                <div className="text-white">
                  <h1 className="text-3xl font-bold">{providerData.full_name}</h1>
                  <p className="text-xl opacity-90">{providerData.provider_profiles?.specialization || providerData.business_name || 'Prestataire de services'}</p>
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
                  <p className="text-gray-600">{providerData.bio || 'Aucune description disponible pour ce prestataire.'}</p>
                </section>

                {/* Note: Nous n'avons pas de portfolio dans les données Supabase, donc on affiche un message */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Portfolio</h2>
                  <div className="bg-gray-100 p-4 rounded-lg text-center">
                    <p className="text-gray-600">Le portfolio de ce prestataire n'est pas encore disponible.</p>
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
                        {providerData.provider_profiles?.rating || '5.0'} ({providerData.provider_profiles?.reviews_count || '0'} avis)
                      </span>
                    </div>
                    <div className="flex items-center mb-2">
                      <MapPin className="w-5 h-5 text-gray-500" />
                      <span className="ml-2">{providerData.city || 'Non renseigné'}</span>
                    </div>
                    <div className="flex items-center mb-2">
                      <Globe className="w-5 h-5 text-gray-500" />
                      <span className="ml-2">
                        Français
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Award className="w-5 h-5 text-gray-500" />
                      <span className="ml-2">
                        Membre depuis {new Date().getFullYear()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">Spécialités</h3>
                    <div className="flex flex-wrap gap-2">
                      {providerData.provider_profiles?.specialization ? (
                        <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm">
                          {providerData.provider_profiles.specialization}
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                          Aucune spécialité renseignée
                        </span>
                      )}
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