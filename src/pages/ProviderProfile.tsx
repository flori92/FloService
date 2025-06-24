import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase-secure';
import { handleSupabaseError, checkTableExists, isTestId, isValidUUID, cleanIdForSupabase } from '../utils/migrationChecker';
import { toast } from 'react-hot-toast';
import { MapPin, Star, Briefcase, Clock, Award, Mail, Phone } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { Alert } from '../components/ui/Alert';
import ChatButton from '../components/chat/ChatButton';

// Interface pour les données du profil prestataire
interface ProviderProfileData {
  id: string;
  full_name: string;
  avatar_url?: string;
  business_name?: string;
  bio?: string;
  is_provider?: boolean;
  city?: string;
  website?: string;
  phone?: string;
  languages?: string[];
  social_links?: {
    linkedin?: string;
    behance?: string;
    instagram?: string;
    [key: string]: string | undefined;
  };
  banner_url?: string;
  rating_average?: number;
  review_count?: number;
  response_time_hours?: number;
  status?: string;
  provider_profiles?: {
    specialization?: string;
    experience_years?: number;
    hourly_rate?: number;
    rating?: number;
    reviews_count?: number;
    description?: string;
    portfolio?: Array<{
      title: string;
      image: string;
      description: string;
    }>;
    skills?: string[];
    certifications?: string[];
  };
}

// Profil par défaut pour éviter les erreurs de données manquantes
const defaultProfile: ProviderProfileData = {
  id: '',
  full_name: 'Prestataire',
  avatar_url: '/default-avatar.png',
  business_name: '',
  bio: 'Informations non disponibles',
  is_provider: true,
  city: '',
  website: '',
  phone: '',
  languages: [],
  social_links: {},
  banner_url: '',
  rating_average: 0,
  review_count: 0,
  response_time_hours: 24,
  status: 'available',
  provider_profiles: {
    specialization: '',
    experience_years: 0,
    hourly_rate: 0,
    rating: 0,
    reviews_count: 0,
    description: '',
    portfolio: [],
    skills: [],
    certifications: []
  }
};

// Composant principal de la page de profil prestataire
const ProviderProfile: React.FC = () => {
  // Récupération de l'ID du prestataire depuis l'URL
  const { id: rawId } = useParams<{ id: string }>();
  const cleanedProviderId = rawId ? rawId.split(':')[0] : null;
  
  // États pour gérer le chargement, les erreurs et les données
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [migrationRequired, setMigrationRequired] = useState<boolean>(false);
  const [providerData, setProviderData] = useState<ProviderProfileData>(defaultProfile);
  
  // Hooks pour la navigation et le chat
  const { openChat } = useChat();
  const navigate = useNavigate();
  
  // Fonction utilitaire pour créer un profil sécurisé à partir des données
  const createSafeProfileFromData = (data: any, isProvider = false): ProviderProfileData => {
    // Si les données sont nulles ou undefined, retourner le profil par défaut
    if (!data) return defaultProfile;

    // Créer un profil de base avec les données disponibles
    const profile: ProviderProfileData = {
      id: data.id || defaultProfile.id,
      full_name: data.full_name || defaultProfile.full_name,
      avatar_url: data.avatar_url || defaultProfile.avatar_url,
      business_name: data.business_name || defaultProfile.business_name,
      bio: data.bio || defaultProfile.bio,
      is_provider: isProvider || data.is_provider || defaultProfile.is_provider,
      city: data.city || defaultProfile.city,
    };

    // Ajouter les données du profil prestataire si disponibles
    if (data.provider_profiles) {
      const providerData = Array.isArray(data.provider_profiles) 
        ? data.provider_profiles[0] 
        : data.provider_profiles;
      
      profile.provider_profiles = {
        specialization: providerData?.specialization || defaultProfile.provider_profiles?.specialization,
        experience_years: providerData?.experience_years || defaultProfile.provider_profiles?.experience_years,
        hourly_rate: providerData?.hourly_rate || defaultProfile.provider_profiles?.hourly_rate,
        rating: providerData?.rating || defaultProfile.provider_profiles?.rating,
        reviews_count: providerData?.reviews_count || defaultProfile.provider_profiles?.reviews_count,
      };
    } else {
      profile.provider_profiles = defaultProfile.provider_profiles;
    }

    return profile;
  };

  // Fonction pour récupérer les données du prestataire via une méthode alternative
  const fetchProviderDataHelper = async (providerId: string) => {
    try {
      // Essayer d'utiliser une requête RPC si disponible
      const { data, error } = await supabase
        .rpc('get_provider_profile', { provider_id: providerId });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur dans fetchProviderDataHelper:', error);
      return null;
    }
  };

  // Vérifier si les tables nécessaires existent
  const checkRequiredTables = async () => {
    try {
      // Vérifier si les tables profiles et provider_profiles existent
      const profilesExist = await checkTableExists('profiles');
      const providerProfilesExist = await checkTableExists('provider_profiles');
      
      if (!profilesExist || !providerProfilesExist) {
        console.warn('Tables requises manquantes:', 
          !profilesExist ? 'profiles' : '', 
          !providerProfilesExist ? 'provider_profiles' : ''
        );
        setMigrationRequired(true);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la vérification des tables:', error);
      setMigrationRequired(true);
      return false;
    }
  };

  // Fonction pour récupérer les données du prestataire avec gestion améliorée des erreurs
  const loadProviderData = async () => {
    if (!cleanedProviderId) {
      setError('Identifiant du prestataire manquant');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Vérifier d'abord si les tables nécessaires existent
      const tablesExist = await checkRequiredTables();
      
      if (!tablesExist) {
        // Si les tables n'existent pas, utiliser le fallback
        console.warn('Tables nécessaires manquantes, utilisation du fallback');
        await fetchProviderDataFallback();
        return;
      }

      // Nettoyer l'ID pour Supabase (gestion des UUID et des ID de test)
      const validId = cleanIdForSupabase(cleanedProviderId);
      
      if (!validId) {
        setError(`Identifiant invalide: ${cleanedProviderId}`);
        setLoading(false);
        return;
      }

      // Récupérer les données du prestataire avec la nouvelle méthode sécurisée
      const { getProfileWithProviderData } = await import('../lib/supabase-secure');
      const result = await getProfileWithProviderData(validId);

      if (result.error) {
        // Utiliser la nouvelle fonction handleSupabaseError qui retourne un objet
        const errorResult = handleSupabaseError(result.error);
        
        if (errorResult.isMigrationError) {
          setMigrationRequired(true);
          // Essayer le fallback si c'est une erreur de migration
          await fetchProviderDataFallback();
        } else {
          setError(errorResult.message);
          setLoading(false);
        }
        return;
      }

      const data = result.data;
      if (!data) {
        setError('Prestataire non trouvé');
        setLoading(false);
        return;
      }

      // Vérifier si l'utilisateur est bien un prestataire
      if (!data.is_provider && !data.provider_profiles) {
        setError('Ce profil n\'est pas un prestataire');
        setLoading(false);
        return;
      }

      // Créer un profil sécurisé à partir des données
      const profile = createSafeProfileFromData(data, true);
      setProviderData(profile);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      setError('Une erreur est survenue lors du chargement du profil');
      setLoading(false);
    }
  };

  // Fonction de fallback pour récupérer les données du prestataire
  const fetchProviderDataFallback = async () => {
    if (!cleanedProviderId) {
      setError('Identifiant du prestataire manquant');
      setLoading(false);
      return;
    }

    try {
      // Pour les ID de test (ex: tg-2), on utilise des données simulées
      if (isTestId(cleanedProviderId)) {
        console.log('Utilisation de données simulées pour ID de test:', cleanedProviderId);
        
        // Simuler un délai réseau
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Créer un profil de test
        const testProfile: ProviderProfileData = {
          id: cleanedProviderId,
          full_name: `Prestataire Test ${cleanedProviderId.split('-')[1]}`,
          avatar_url: '/default-avatar.png',
          business_name: 'Entreprise Test',
          bio: 'Ceci est un profil de test généré automatiquement car les migrations Supabase n\'ont pas été appliquées.',
          is_provider: true,
          city: 'Paris',
          provider_profiles: {
            specialization: 'Test',
            experience_years: 5,
            hourly_rate: 50,
            rating: 4.5,
            reviews_count: 10
          }
        };
        
        setProviderData(testProfile);
        setLoading(false);
        return;
      }
      
      // Pour les UUID valides, on essaie d'utiliser le helper de récupération
      if (isValidUUID(cleanedProviderId)) {
        try {
          const data = await fetchProviderDataHelper(cleanedProviderId);
          if (data) {
            const profile = createSafeProfileFromData(data, true);
            setProviderData(profile);
            setLoading(false);
            return;
          }
        } catch (helperError) {
          console.warn('Erreur avec fetchProviderDataHelper:', helperError);
          // Continuer avec la méthode de fallback ci-dessous
        }
      }
      
      // Fallback ultime: profil par défaut avec l'ID fourni
      const fallbackProfile = {
        ...defaultProfile,
        id: cleanedProviderId,
        full_name: `Prestataire ${cleanedProviderId.substring(0, 8)}`,
        bio: 'Les informations complètes de ce prestataire ne sont pas disponibles actuellement.'
      };
      
      setProviderData(fallbackProfile);
      setLoading(false);
    } catch (error) {
      console.error('Erreur dans le fallback:', error);
      setError('Impossible de récupérer les données du prestataire');
      setLoading(false);
    }
  };

  // Charger les données au montage du composant
  useEffect(() => {
    if (cleanedProviderId) {
      loadProviderData();
    } else {
      setError('Identifiant du prestataire manquant');
      setLoading(false);
    }
  }, [cleanedProviderId]);

  // Gérer le clic sur le bouton de chat
  const handleChatClick = () => {
    if (cleanedProviderId && openChat) {
      openChat(cleanedProviderId, providerData?.full_name || 'Prestataire');
    }
  };

  // Rendu du composant
  return (
    <div className="provider-profile-container">
      <main className="provider-profile-main">
        {/* Affichage pendant le chargement */}
        {loading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Chargement du profil...</p>
          </div>
        )}

        {/* Affichage en cas d'erreur */}
        {!loading && error && (
          <div className="error-container">
            <Alert variant="destructive">
              <h4>Erreur</h4>
              <p>{error}</p>
            </Alert>
            <button 
              className="btn btn-primary mt-4" 
              onClick={() => navigate(-1)}
            >
              Retour
            </button>
          </div>
        )}

        {/* Affichage si migration requise */}
        {!loading && migrationRequired && (
          <div className="migration-required-container">
            <Alert variant="warning">
              <h4>Migration requise</h4>
              <p>La base de données nécessite une mise à jour. Veuillez contacter l'administrateur pour appliquer les migrations.</p>
            </Alert>
            {providerData && !error && (
              <div className="mt-4">
                <p>Affichage des informations limitées disponibles :</p>
              </div>
            )}
          </div>
        )}

        {/* Affichage du profil */}
        {!loading && providerData && !error && (
          <div className="profile-content">
            {/* En-tête du profil */}
            <div className="profile-header">
              <div className="profile-avatar">
                <img 
                  src={providerData.avatar_url || '/default-avatar.png'} 
                  alt={`Avatar de ${providerData.full_name}`} 
                  className="avatar-image"
                />
              </div>
              
              <div className="profile-header-info">
                <h1 className="profile-name">{providerData.full_name}</h1>
                
                {providerData.business_name && (
                  <h2 className="business-name">{providerData.business_name}</h2>
                )}
                
                {providerData.provider_profiles?.rating && (
                  <div className="rating">
                    <Star className="icon" />
                    <span>{providerData.provider_profiles.rating.toFixed(1)}</span>
                    {providerData.provider_profiles.reviews_count && (
                      <span className="reviews-count">
                        ({providerData.provider_profiles.reviews_count} avis)
                      </span>
                    )}
                  </div>
                )}
                
                {providerData.city && (
                  <div className="location">
                    <MapPin className="icon" />
                    <span>{providerData.city}</span>
                  </div>
                )}
              </div>
              
              <div className="profile-actions">
                <ChatButton onClick={handleChatClick} />
              </div>
            </div>
            
            {/* Corps du profil */}
            <div className="profile-body">
              {/* Bio */}
              {providerData.bio && (
                <div className="bio-section section">
                  <h3 className="section-title">À propos</h3>
                  <p className="bio-text">{providerData.bio}</p>
                </div>
              )}
              
              {/* Informations professionnelles */}
              <div className="professional-info section">
                <h3 className="section-title">Informations professionnelles</h3>
                
                <div className="info-grid">
                  {providerData.provider_profiles?.specialization && (
                    <div className="info-item">
                      <Briefcase className="icon" />
                      <div className="info-content">
                        <span className="info-label">Spécialité</span>
                        <span className="info-value">{providerData.provider_profiles.specialization}</span>
                      </div>
                    </div>
                  )}
                  
                  {providerData.provider_profiles?.experience_years && (
                    <div className="info-item">
                      <Clock className="icon" />
                      <div className="info-content">
                        <span className="info-label">Expérience</span>
                        <span className="info-value">
                          {providerData.provider_profiles.experience_years} an{providerData.provider_profiles.experience_years > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {providerData.provider_profiles?.hourly_rate && (
                    <div className="info-item">
                      <Award className="icon" />
                      <div className="info-content">
                        <span className="info-label">Tarif horaire</span>
                        <span className="info-value">{providerData.provider_profiles.hourly_rate}€/h</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Portfolio */}
              {providerData.provider_profiles?.portfolio && providerData.provider_profiles.portfolio.length > 0 && (
                <div className="portfolio-section section">
                  <h3 className="section-title">Portfolio</h3>
                  <div className="portfolio-grid">
                    {providerData.provider_profiles.portfolio.map((project, index) => (
                      <div key={index} className="portfolio-item">
                        <img 
                          src={project.image} 
                          alt={project.title}
                          className="portfolio-image"
                        />
                        <div className="portfolio-content">
                          <h4 className="portfolio-title">{project.title}</h4>
                          <p className="portfolio-description">{project.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Compétences */}
              {providerData.provider_profiles?.skills && providerData.provider_profiles.skills.length > 0 && (
                <div className="skills-section section">
                  <h3 className="section-title">Compétences</h3>
                  <div className="skills-list">
                    {providerData.provider_profiles.skills.map((skill, index) => (
                      <span key={index} className="skill-tag">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {providerData.provider_profiles?.certifications && providerData.provider_profiles.certifications.length > 0 && (
                <div className="certifications-section section">
                  <h3 className="section-title">Certifications</h3>
                  <div className="certifications-list">
                    {providerData.provider_profiles.certifications.map((cert, index) => (
                      <div key={index} className="certification-item">
                        <Award className="icon" />
                        <span>{cert}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Informations de contact */}
              {(providerData.phone || providerData.website || providerData.social_links) && (
                <div className="contact-section section">
                  <h3 className="section-title">Contact</h3>
                  <div className="contact-info">
                    {providerData.phone && (
                      <div className="contact-item">
                        <Phone className="icon" />
                        <a href={`tel:${providerData.phone}`} className="contact-link">
                          {providerData.phone}
                        </a>
                      </div>
                    )}
                    
                    {providerData.website && (
                      <div className="contact-item">
                        <Mail className="icon" />
                        <a href={providerData.website} target="_blank" rel="noopener noreferrer" className="contact-link">
                          Site web
                        </a>
                      </div>
                    )}

                    {providerData.social_links && Object.keys(providerData.social_links).length > 0 && (
                      <div className="social-links">
                        {Object.entries(providerData.social_links).map(([platform, url]) => (
                          url && (
                            <a 
                              key={platform} 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="social-link"
                            >
                              {platform.charAt(0).toUpperCase() + platform.slice(1)}
                            </a>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProviderProfile;
