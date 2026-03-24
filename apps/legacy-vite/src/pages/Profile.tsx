import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { isValidUUID } from '../utils/validation';

interface Profile {
  id: string;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export default function Profile() {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    business_name: '',
    phone: ''
  });

  useEffect(() => {
    if (user) {
      getProfile();
    }
  }, [user]);

  async function getProfile() {
    try {
      setLoading(true);
      
      if (!user?.id || !isValidUUID(user.id)) {
        toast.error("Identifiant utilisateur invalide (UUID requis)");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erreur lors du chargement du profil:', error.message, error.code);
        toast.error("Impossible de charger votre profil");
        setLoading(false);
        return;
      }
      
      // Vérification et création sécurisée du profil
      if (!data) {
        console.warn('Données de profil manquantes');
        toast.error("Impossible de charger votre profil: données manquantes");
        setLoading(false);
        return;
      }
      
      // Création sécurisée du profil à partir des données
      // Utilisation d'une assertion de type pour contourner les limitations du typage Supabase
      const rawData = data as any;
      const profileData: Profile = {
        id: rawData.id || user.id,
        full_name: rawData.full_name || null,
        business_name: rawData.business_name || null,
        phone: rawData.phone || null,
        avatar_url: rawData.avatar_url || null
      };
      
      // Maintenant nous pouvons utiliser profileData en toute sécurité
      setProfile(profileData);
      setFormData({
        full_name: profileData.full_name || '',
        business_name: profileData.business_name || '',
        phone: profileData.phone || ''
      });
    } catch (error) {
      toast.error('Error loading profile');
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile() {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          business_name: formData.business_name,
          phone: formData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) throw error;
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Error updating profile');
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Profile Settings</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="business_name" className="block text-sm font-medium text-gray-700">
              Business Name
            </label>
            <input
              type="text"
              id="business_name"
              name="business_name"
              value={formData.business_name}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}