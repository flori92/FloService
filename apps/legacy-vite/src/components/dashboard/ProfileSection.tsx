import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Facebook, Instagram, Twitter, Globe, Linkedin } from 'lucide-react';

interface ProfileSectionProps {
  profile: any;
  onProfileUpdate: () => void;
}

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ profile, onProfileUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    business_name: profile?.business_name || '',
    phone: profile?.phone || '',
    bio: profile?.bio || '',
    website: profile?.website || '',
    social_links: (profile?.social_links || {}) as SocialLinks
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSocialChange = (platform: keyof SocialLinks, value: string) => {
    setFormData(prev => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [platform]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          business_name: formData.business_name,
          phone: formData.phone,
          bio: formData.bio,
          website: formData.website,
          social_links: formData.social_links,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      toast.success('Profil mis à jour avec succès');
      onProfileUpdate();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      toast.error('Impossible de mettre à jour le profil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Informations du profil</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
              Nom complet
            </label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              placeholder="Votre nom complet"
            />
          </div>
          
          <div>
            <label htmlFor="business_name" className="block text-sm font-medium text-gray-700 mb-1">
              Nom de l'entreprise
            </label>
            <input
              type="text"
              id="business_name"
              name="business_name"
              value={formData.business_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              placeholder="Nom de votre entreprise (optionnel)"
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
            Biographie
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            value={formData.bio}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
            placeholder="Décrivez votre activité et votre expertise..."
          />
          <p className="mt-1 text-sm text-gray-500">
            Une bonne bio aide vos clients potentiels à vous connaître et à vous faire confiance.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Téléphone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              placeholder="+229 XX XX XX XX"
            />
          </div>
          
          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
              Site web
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                <Globe className="h-4 w-4" />
              </span>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                placeholder="https://votresite.com"
              />
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-3">Réseaux sociaux</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="facebook" className="block text-sm font-medium text-gray-700 mb-1">
                Facebook
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                  <Facebook className="h-4 w-4" />
                </span>
                <input
                  type="url"
                  id="facebook"
                  value={formData.social_links.facebook || ''}
                  onChange={(e) => handleSocialChange('facebook', e.target.value)}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  placeholder="https://facebook.com/votrepage"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-1">
                Instagram
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                  <Instagram className="h-4 w-4" />
                </span>
                <input
                  type="url"
                  id="instagram"
                  value={formData.social_links.instagram || ''}
                  onChange={(e) => handleSocialChange('instagram', e.target.value)}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  placeholder="https://instagram.com/votrecompte"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="twitter" className="block text-sm font-medium text-gray-700 mb-1">
                Twitter
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                  <Twitter className="h-4 w-4" />
                </span>
                <input
                  type="url"
                  id="twitter"
                  value={formData.social_links.twitter || ''}
                  onChange={(e) => handleSocialChange('twitter', e.target.value)}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  placeholder="https://twitter.com/votrecompte"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700 mb-1">
                LinkedIn
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                  <Linkedin className="h-4 w-4" />
                </span>
                <input
                  type="url"
                  id="linkedin"
                  value={formData.social_links.linkedin || ''}
                  onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  placeholder="https://linkedin.com/in/votreprofil"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSection;
