/**
 * Configuration du backend
 * Ce fichier configure l'utilisation exclusive de Supabase comme backend
 */

// Définir Supabase comme backend par défaut
const BACKEND_PROVIDER = 'supabase';

// Exporter la configuration
export const backendConfig = {
  provider: BACKEND_PROVIDER,
  isSupabase: true,
  isAppwrite: false,
  
  // Configuration Supabase
  supabase: {
    url: process.env.VITE_SUPABASE_URL || 'https://your-supabase-url.supabase.co',
    key: process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key',
    apiEndpoint: '/api/v1'
  }
};

// Fonction utilitaire pour obtenir le client approprié
export const getBackendClient = () => {
  // Puisque nous utilisons uniquement Supabase, retourner directement le client Supabase
  return import('../lib/supabaseClient').then(module => module.default);
};

// Export par défaut
export default backendConfig;
