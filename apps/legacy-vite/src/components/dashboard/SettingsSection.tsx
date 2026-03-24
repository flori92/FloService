import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Bell, Lock, Globe, LogOut, Calendar } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

interface SettingsSectionProps {
  userId: string | undefined;
}

interface UserSettings {
  email_notifications: boolean;
  sms_notifications: boolean;
  booking_auto_confirm: boolean;
  availability_days: string[];
  language: string;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ userId }) => {
  const navigate = useNavigate();
  const authStore = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [settings, setSettings] = useState<UserSettings>({
    email_notifications: true,
    sms_notifications: false,
    booking_auto_confirm: false,
    availability_days: ['1', '2', '3', '4', '5'],
    language: 'fr'
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (userId) {
      fetchSettings();
    }
  }, [userId]);

  const fetchSettings = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 est le code pour "aucun résultat"
        throw error;
      }
      
      if (data) {
        setSettings({
          email_notifications: data.email_notifications,
          sms_notifications: data.sms_notifications,
          booking_auto_confirm: data.booking_auto_confirm,
          availability_days: data.availability_days || ['1', '2', '3', '4', '5'],
          language: data.language || 'fr'
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
      toast.error('Impossible de charger vos paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (setting: keyof UserSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleDayToggle = (day: string) => {
    setSettings(prev => {
      const days = [...prev.availability_days];
      if (days.includes(day)) {
        return { ...prev, availability_days: days.filter(d => d !== day) };
      } else {
        return { ...prev, availability_days: [...days, day] };
      }
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Réinitialiser l'erreur lorsque l'utilisateur modifie un champ
    setPasswordError('');
  };

  const saveSettings = async () => {
    if (!userId) return;
    
    try {
      setSavingSettings(true);
      
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          email_notifications: settings.email_notifications,
          sms_notifications: settings.sms_notifications,
          booking_auto_confirm: settings.booking_auto_confirm,
          availability_days: settings.availability_days,
          language: settings.language,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      toast.success('Paramètres enregistrés avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement des paramètres:', error);
      toast.error('Impossible d\'enregistrer les paramètres');
    } finally {
      setSavingSettings(false);
    }
  };

  const changePassword = async () => {
    if (!userId) return;
    
    try {
      setChangingPassword(true);
      setPasswordError('');
      
      // Vérifier que les mots de passe correspondent
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError('Les mots de passe ne correspondent pas');
        return;
      }
      
      // Vérifier la longueur du mot de passe
      if (passwordData.newPassword.length < 8) {
        setPasswordError('Le mot de passe doit contenir au moins 8 caractères');
        return;
      }
      
      // Appeler l'API Supabase pour changer le mot de passe
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;
      
      // Réinitialiser les champs
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      toast.success('Mot de passe modifié avec succès');
    } catch (error: any) {
      console.error('Erreur lors du changement de mot de passe:', error);
      setPasswordError(error.message || 'Impossible de changer le mot de passe');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Redirection directe sans appel à logout() qui n'existe pas
      navigate('/login');
      toast.success('Déconnexion réussie');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const dayNames = [
    { id: '1', name: 'Lundi' },
    { id: '2', name: 'Mardi' },
    { id: '3', name: 'Mercredi' },
    { id: '4', name: 'Jeudi' },
    { id: '5', name: 'Vendredi' },
    { id: '6', name: 'Samedi' },
    { id: '0', name: 'Dimanche' }
  ];

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Chargement de vos paramètres...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Paramètres</h2>
      
      <div className="space-y-8">
        {/* Notifications */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Bell className="h-5 w-5 mr-2 text-teal-600" />
            Notifications
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-700">Notifications par email</p>
                <p className="text-sm text-gray-500">Recevez des emails pour les nouvelles réservations et messages</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.email_notifications}
                  onChange={() => handleSettingChange('email_notifications', !settings.email_notifications)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-700">Notifications SMS</p>
                <p className="text-sm text-gray-500">Recevez des SMS pour les nouvelles réservations</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.sms_notifications}
                  onChange={() => handleSettingChange('sms_notifications', !settings.sms_notifications)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-700">Confirmation automatique</p>
                <p className="text-sm text-gray-500">Confirmer automatiquement les nouvelles réservations</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.booking_auto_confirm}
                  onChange={() => handleSettingChange('booking_auto_confirm', !settings.booking_auto_confirm)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>
          </div>
        </div>
        
        {/* Disponibilité */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-teal-600" />
            Disponibilité
          </h3>
          
          <div>
            <p className="text-gray-700 mb-3">Jours de disponibilité</p>
            <div className="flex flex-wrap gap-2">
              {dayNames.map(day => (
                <button
                  key={day.id}
                  onClick={() => handleDayToggle(day.id)}
                  className={`px-3 py-1 rounded-md text-sm ${
                    settings.availability_days.includes(day.id)
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {day.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Langue */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Globe className="h-5 w-5 mr-2 text-teal-600" />
            Langue
          </h3>
          
          <div>
            <p className="text-gray-700 mb-3">Langue de l'interface</p>
            <select
              value={settings.language}
              onChange={(e) => handleSettingChange('language', e.target.value)}
              className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
        
        {/* Sécurité */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Lock className="h-5 w-5 mr-2 text-teal-600" />
            Sécurité
          </h3>
          
          <div className="space-y-4">
            <p className="text-gray-700">Changer le mot de passe</p>
            
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe actuel
              </label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            
            {passwordError && (
              <p className="text-sm text-red-600">{passwordError}</p>
            )}
            
            <div>
              <button
                onClick={changePassword}
                disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {changingPassword ? 'Modification...' : 'Changer le mot de passe'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Boutons d'action */}
        <div className="flex flex-col md:flex-row justify-between space-y-4 md:space-y-0">
          <button
            onClick={saveSettings}
            disabled={savingSettings}
            className="px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingSettings ? 'Enregistrement...' : 'Enregistrer les paramètres'}
          </button>
          
          <button
            onClick={handleLogout}
            className="px-6 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center justify-center"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsSection;
