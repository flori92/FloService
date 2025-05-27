import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Edit, Upload, Trash2, User, Briefcase, Image, Calendar, BarChart2, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import Header from '../components/Header';
import Footer from '../components/Footer';

// Composants de sections
import ProfileSection from '../components/dashboard/ProfileSection';
import PortfolioSection from '../components/dashboard/PortfolioSection';
import ServicesSection from '../components/dashboard/ServicesSection';
import BookingsSection from '../components/dashboard/BookingsSection';
import StatsSection from '../components/dashboard/StatsSection';
import SettingsSection from '../components/dashboard/SettingsSection';

// Types
type DashboardTab = 'profile' | 'portfolio' | 'services' | 'bookings' | 'stats' | 'settings';

interface ProviderProfile {
  id: string;
  full_name: string | null;
  business_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  phone: string | null;
  website: string | null;
  social_links: Record<string, string> | null;
  role: string;
  is_provider: boolean;
}

const ProviderDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('profile');
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    getProfile();
  }, [user, navigate]);

  const getProfile = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        // Vérifier si l'utilisateur est un prestataire
        if (!data.is_provider && data.role !== 'provider') {
          toast.error('Vous n\'avez pas accès au tableau de bord prestataire');
          navigate('/');
          return;
        }
        
        setProfile(data as ProviderProfile);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      toast.error('Impossible de charger votre profil');
    } finally {
      setLoading(false);
    }
  };

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-banner-${Date.now()}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      setUploadingBanner(true);

      // Upload de l'image vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('provider-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Récupération de l'URL publique
      const { data: urlData } = supabase.storage
        .from('provider-assets')
        .getPublicUrl(filePath);

      // Mise à jour du profil avec la nouvelle URL de bannière
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ banner_url: urlData.publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // Mise à jour de l'état local
      setProfile(prev => prev ? { ...prev, banner_url: urlData.publicUrl } : null);
      toast.success('Bannière mise à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'upload de la bannière:', error);
      toast.error('Impossible de mettre à jour la bannière');
    } finally {
      setUploadingBanner(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'portfolio', label: 'Portfolio', icon: Image },
    { id: 'services', label: 'Services', icon: Briefcase },
    { id: 'bookings', label: 'Réservations', icon: Calendar },
    { id: 'stats', label: 'Statistiques', icon: BarChart2 },
    { id: 'settings', label: 'Paramètres', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-24">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Bannière personnalisable */}
          <div 
            className="relative h-64 bg-cover bg-center"
            style={{ 
              backgroundImage: profile?.banner_url 
                ? `url(${profile.banner_url})` 
                : 'linear-gradient(to right, #0ea5e9, #10b981)'
            }}
          >
            <div className="absolute inset-0 bg-black/30"></div>
            
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <img
                    src={profile?.avatar_url || 'https://via.placeholder.com/150'}
                    alt={profile?.full_name || 'Prestataire'}
                    className="w-24 h-24 rounded-full border-4 border-white object-cover"
                  />
                  <label 
                    htmlFor="avatar-upload" 
                    className="absolute bottom-0 right-0 bg-white p-1 rounded-full cursor-pointer shadow-md"
                  >
                    <Edit className="h-4 w-4 text-gray-700" />
                    <input 
                      type="file" 
                      id="avatar-upload" 
                      className="hidden" 
                      accept="image/*"
                      onChange={() => toast.info('Fonctionnalité à venir')}
                    />
                  </label>
                </div>
                <div className="text-white">
                  <h1 className="text-2xl font-bold">
                    {profile?.business_name || profile?.full_name || 'Prestataire'}
                  </h1>
                  <p className="text-white/80">
                    {profile?.bio ? profile.bio.substring(0, 100) + '...' : 'Ajoutez une bio à votre profil'}
                  </p>
                </div>
              </div>
            </div>
            
            <label 
              htmlFor="banner-upload" 
              className="absolute top-4 right-4 bg-white/80 p-2 rounded-full cursor-pointer shadow-md hover:bg-white transition-colors"
            >
              <Camera className="h-5 w-5 text-gray-700" />
              <input 
                type="file" 
                id="banner-upload" 
                className="hidden" 
                accept="image/*"
                onChange={handleBannerUpload}
                disabled={uploadingBanner}
              />
            </label>
          </div>
          
          {/* Navigation par onglets */}
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto py-4 px-6">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as DashboardTab)}
                  className={`flex items-center px-4 py-2 mr-4 rounded-lg transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-teal-50 text-teal-600 font-medium' 
                      : 'text-gray-600 hover:text-teal-600 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-2" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
          
          {/* Contenu dynamique selon l'onglet actif */}
          <div className="p-6">
            {activeTab === 'profile' && <ProfileSection profile={profile} onProfileUpdate={getProfile} />}
            {activeTab === 'portfolio' && <PortfolioSection userId={user?.id} />}
            {activeTab === 'services' && <ServicesSection userId={user?.id} />}
            {activeTab === 'bookings' && <BookingsSection userId={user?.id} />}
            {activeTab === 'stats' && <StatsSection userId={user?.id} />}
            {activeTab === 'settings' && <SettingsSection userId={user?.id} />}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProviderDashboard;
