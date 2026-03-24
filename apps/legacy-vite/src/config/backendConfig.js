/**
 * Backend configuration
 * Configures Supabase as the sole backend provider.
 */

// Supabase configuration
export const backendConfig = {
  provider: 'supabase',
  isSupabase: true,
  isAppwrite: false,
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    apiEndpoint: '/api/v1',
  },
};

export default backendConfig;