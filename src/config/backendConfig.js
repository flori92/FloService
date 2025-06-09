/**
 * Configuration du backend
 * Ce fichier configure l'utilisation exclusive de Supabase comme backend
 */

import { supabase } from '../lib/supabase-secure.ts';

// Définir Supabase comme backend par défaut
const BACKEND_PROVIDER = 'supabase';

// Exporter la configuration
export const backendConfig = {
  provider: BACKEND_PROVIDER,
  isSupabase: true,
  isAppwrite: false,
  
  // Configuration Supabase
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || 'https://sxrofrdhpzpjqkplgoij.supabase.co',
    key: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cm9mcmRocHpwanFrcGxnb2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNjY2NzksImV4cCI6MjA2Mzc0MjY3OX0.ddLsIbp814amozono-gIhjNPWYE4Lgo20dJmG3Q-Cww',
    apiEndpoint: '/api/v1'
  }
};

// Fonction utilitaire pour obtenir le client approprié
export const getBackendClient = () => {
  // Retourner directement le client Supabase importé
  return Promise.resolve(supabase);
};

// Export par défaut
export default backendConfig;