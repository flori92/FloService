import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StorageClient } from '@supabase/storage-js';

// Fonction de secours en cas d'échec d'initialisation
const createFallbackClient = (): ExtendedSupabaseClient => {
  console.warn('Utilisation du client de secours Supabase');
  
  // Implémentation minimale pour éviter les erreurs
  const fallbackResponse = { data: null, error: { message: 'Client de secours' } };
  
  // Retourner directement un mock du client Supabase qui correspond au type ExtendedSupabaseClient
  return {
    // Propriétés obligatoires de SupabaseClient
    supabaseUrl: 'https://fallback.supabase.co',
    supabaseKey: 'fallback-key',
    realtime: { connect: () => {}, disconnect: () => {}, removeChannel: () => {} },
    realtimeUrl: 'wss://fallback.supabase.co',
    rest: { baseUrl: 'https://fallback.supabase.co' },
    headers: {},
    auth: {
      onAuthStateChange: () => ({ 
        data: { 
          subscription: { 
            unsubscribe: () => {}
          } 
        } 
      }),
      signIn: () => Promise.resolve({ error: { message: 'Client de secours - Non disponible' } }),
      signOut: () => Promise.resolve({ error: null }),
      user: () => ({ id: 'fallback-user' }),
      getUser: () => Promise.resolve({ data: { user: { id: 'fallback-user' } }, error: null }),
      // Autres méthodes requises
      session: () => null,
      refreshSession: () => Promise.resolve({ data: null, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      setSession: () => Promise.resolve({ data: { session: null }, error: null }),
      setAuth: () => {}
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve(fallbackResponse)
        })
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve(fallbackResponse)
        })
      })
    }),
    storage: {
      from: (bucket: string) => ({
        upload: (path: string, file: File | string, options?: any) => Promise.resolve(fallbackResponse),
        getPublicUrl: (path: string) => ({ data: { publicUrl: '' } })
      })
    },
    rpc: () => Promise.resolve(fallbackResponse),
    // Autres méthodes requises
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => {},
    getChannels: () => [],
    removeAllChannels: () => {},
    functions: { invoke: () => Promise.resolve(fallbackResponse) }
  } as unknown as ExtendedSupabaseClient;
};

// Type du client de secours
type FallbackSupabaseClient = ReturnType<typeof createFallbackClient>;

// Type étendu pour inclure le stockage
type ExtendedSupabaseClient = SupabaseClient<Database, 'public', {
  Tables: { [key: string]: any };
  Views: { [key: string]: any };
  Functions: {
    is_provider: { Args: { user_id?: string }; Returns: boolean };
    check_invoice_permissions: { Args: { invoice_id: string }; Returns: boolean };
    log_audit_action: {
      Args: {
        action: string;
        table_name: string;
        record_id: string;
        old_data?: Json;
        new_data?: Json;
      };
      Returns: undefined;
    };
    [key: string]: any;
  };
}> & {
  storage: StorageClient;
};

// Types de base pour Supabase
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Interface pour la base de données
export interface Database {
  public: {
    Tables: {
      [key: string]: any;
    };
    Views: {
      [key: string]: any;
    };
    Functions: {
      is_provider: {
        Args: { user_id?: string };
        Returns: boolean;
      };
      check_invoice_permissions: {
        Args: { invoice_id: string };
        Returns: boolean;
      };
      log_audit_action: {
        Args: {
          action: string;
          table_name: string;
          record_id: string;
          old_data?: Json;
          new_data?: Json;
        };
        Returns: undefined;
      };
      [key: string]: any;
    };
  };
}

// Configuration de débogage
const DEBUG = import.meta.env.VITE_DEBUG === 'true';

// Fonction utilitaire pour le logging
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log('[Supabase]', ...args);
  }
};

// Fonction sécurisée pour récupérer les variables d'environnement
const getEnvVariable = (key: string, defaultValue: string): string => {
  // Vérifier d'abord import.meta.env (Vite)
  debugLog(`Récupération de la variable d'environnement: ${key}`);
  const viteValue = (import.meta as any).env?.[key];
  if (viteValue) {
    return viteValue;
  }
  
  // Vérifier ensuite process.env (Node.js/React)
  const processValue = typeof process !== 'undefined' && process.env && (process.env as any)[key];
  if (processValue) {
    return processValue;
  }
  
  // Vérifier window.ENV (injection runtime)
  const windowValue = typeof window !== 'undefined' && window.ENV && window.ENV[key];
  if (windowValue) {
    return windowValue;
  }
  
  // Retourner la valeur par défaut
  console.warn(`Variable d'environnement ${key} non trouvée, utilisation de la valeur par défaut`);
  return defaultValue;
};

// Récupération des variables d'environnement avec fallback
const supabaseUrl = getEnvVariable(
  'VITE_SUPABASE_URL',
  'https://sxrofrdhpzpjqkplgoij.supabase.co'
);

const supabaseKey = getEnvVariable(
  'VITE_SUPABASE_ANON_KEY',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cm9mcmRocHpwanFrcGxnb2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNjY2NzksImV4cCI6MjA2Mzc0MjY3OX0.ddLsIbp814amozono-gIhjNPWYE4Lgo20dJmG3Q-Cww'
);

// Vérification des variables d'environnement critiques
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configuration Supabase manquante. Vérifiez vos variables d\'environnement.');
  if (!supabaseUrl) {
    console.error('VITE_SUPABASE_URL est manquant');
  }
  if (!supabaseKey) {
    console.error('VITE_SUPABASE_ANON_KEY est manquant');
  }
}

// Création du client Supabase avec gestion d'erreur
export const createSupabaseClient = (): ExtendedSupabaseClient => {
  try {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Configuration Supabase incomplète');
    }

    // Configuration du client Supabase avec typage correct
    const supabaseOptions = {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // Désactiver pour éviter les erreurs JWT au démarrage
        // Désactiver la vérification automatique de session au démarrage
        // pour éviter les erreurs de JWT invalide
        flowType: 'pkce'
      },
      // Désactiver les requêtes de télémétrie
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      global: {
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'X-Client-Info': 'FloService Web Client',
          'Prefer': 'return=representation',
        },
      },
      // Le schéma est défini directement dans le type Database
    } as const; // Utilisation de 'as const' pour le typage littéral

    // Création du client Supabase typé
    const supabaseInstance = createClient<Database>(
      supabaseUrl,
      supabaseKey,
      supabaseOptions
    );

    // Vérification de la connexion au démarrage (sans authentification)
    const checkInitialConnection = async () => {
      try {
        // Test simple de connectivité sans authentification
        const { data, error } = await supabaseInstance
          .from('categories')
          .select('id')
          .limit(1);
          
        if (error && error.code !== 'PGRST116') { // PGRST116 = table vide, c'est OK
          console.warn('⚠️ Avertissement de connexion à Supabase:', error.message);
          return false;
        }
        console.log('✅ Connexion à Supabase établie avec succès');
        return true;
      } catch (err) {
        console.warn('⚠️ Avertissement lors de la vérification de la connexion Supabase:', err);
        return false;
      }
    };

    // Exécuter la vérification de connexion au chargement (de manière asynchrone)
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        checkInitialConnection();
      }, 1000);
    }

    return supabaseInstance;
  } catch (error) {
    console.error('❌ Erreur critique lors de la création du client Supabase:', error);
    console.warn('Utilisation du client de secours');
    return createFallbackClient();
  }
};

// Création et exportation du client Supabase
export const supabase: ExtendedSupabaseClient = createSupabaseClient();

// Fonction utilitaire pour échapper les entrées utilisateur dans les recherches
export function safeSearchTerm(term: string): string {
  if (!term) {
    return '';
  }
  
  return term
    .replace(/[\s\t\n]+/g, ' ') // Remplacer les espaces multiples par un seul espace
    .trim()
    .substring(0, 255) // Limiter la longueur pour éviter les abus
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "''");
};

/**
 * Vérifie si l'ID fourni correspond à l'utilisateur actuellement connecté
 * @param userId - L'ID à vérifier
 * @returns true si l'ID correspond à l'utilisateur connecté, false sinon
 */
const isCurrentUserId = async (userId?: string): Promise<boolean> => {
  console.log('[Debug RLS] isCurrentUserId called with userId:', userId);
  if (!userId || !supabase) {
    console.log('[Debug RLS] isCurrentUserId: no userId or supabase client. Returning false.');
    return false;
  }
  
  try {
    let currentAuthUserId: string | undefined;
    // Vérifier avec getSession si disponible
    if ('getSession' in supabase.auth) {
      const { data: { session } } = await (supabase.auth as any).getSession();
      currentAuthUserId = session?.user?.id;
      console.log('[Debug RLS] isCurrentUserId: using getSession. session?.user?.id:', currentAuthUserId);
    }
    // Sinon vérifier avec user()
    else if ('user' in supabase.auth) {
      const user = (supabase.auth as any).user();
      currentAuthUserId = user?.id;
      console.log('[Debug RLS] isCurrentUserId: using user(). user?.id:', currentAuthUserId);
    }
    
    const match = currentAuthUserId === userId;
    console.log(`[Debug RLS] isCurrentUserId: Comparison: ${currentAuthUserId} === ${userId} -> ${match}`);
    return match;
  } catch (err) {
    console.error('[Debug RLS] Erreur dans isCurrentUserId:', err);
    return false;
  }
};

// Fonction utilitaire pour vérifier si l'utilisateur est un prestataire
export const isProvider = async (userId?: string): Promise<boolean> => {
  console.log('[Debug RLS] isProvider called with initial userId:', userId);
  try {
    // Vérification du client Supabase
    if (!supabase) {
      console.error('❌ Client Supabase non initialisé');
      return false;
    }

    let resolvedUserId = userId;
    // Si aucun userId n'est fourni, vérifier l'utilisateur connecté
    if (!resolvedUserId) {
      console.log('[Debug RLS] isProvider: userId is initially null/undefined. Attempting to get current user.');
      try {
        // Essayer d'abord avec getSession() si disponible
        if ('getSession' in supabase.auth) {
          const { data: { session } } = await (supabase.auth as any).getSession();
          if (session?.user) {
            resolvedUserId = session.user.id;
            console.log('[Debug RLS] isProvider: userId resolved from getSession:', resolvedUserId);
          }
        } 
        // Sinon essayer avec user()
        else if ('user' in supabase.auth) {
          const user = (supabase.auth as any).user();
          if (user) {
            resolvedUserId = user.id;
            console.log('[Debug RLS] isProvider: userId resolved from user():', resolvedUserId);
          }
        }

        if (!resolvedUserId) {
          console.error('[Debug RLS] isProvider: ❌ Aucun utilisateur connecté et aucun userId fourni');
          return false;
        }
      } catch (err) {
        console.error('[Debug RLS] isProvider: ❌ Erreur lors de la récupération de l\'utilisateur:', err);
        return false;
      }
    }
    console.log('[Debug RLS] isProvider: resolvedUserId to use for checks:', resolvedUserId);

    try {
      // Vérifier si on cherche le statut de l'utilisateur actuellement connecté
      const isCurrentUser = await isCurrentUserId(resolvedUserId);
      console.log('[Debug RLS] isProvider: isCurrentUserId returned:', isCurrentUser, 'for userId:', resolvedUserId);
      
      // Si c'est l'utilisateur actuel, utiliser get_my_provider_status (plus sûr)
      if (isCurrentUser && 'rpc' in supabase) {
        console.log('[Debug RLS] isProvider: Attempting RPC get_my_provider_status for current user.');
        try {
          const { data: myStatus, error: myStatusError } = await (supabase as any).rpc('get_my_provider_status');
          if (!myStatusError) {
            console.log('[Debug RLS] isProvider: RPC get_my_provider_status success. Status:', myStatus);
            return myStatus === true;
          }
          console.warn('[Debug RLS] isProvider: RPC get_my_provider_status failed:', myStatusError);
        } catch (rpcErr) {
          console.warn('[Debug RLS] isProvider: Exception during RPC get_my_provider_status:', rpcErr);
        }
      } else {
        if (!isCurrentUser) {
          console.log('[Debug RLS] isProvider: Not current user or RPC not available for get_my_provider_status.');
        }
        if (!('rpc' in supabase)) {
          console.log('[Debug RLS] isProvider: supabase.rpc not available.');
        }
      }
      
      // Sinon, essayer d'utiliser la méthode RPC is_provider avec l'ID spécifié
      console.log('[Debug RLS] isProvider: Attempting RPC is_provider with userId:', resolvedUserId);
      if ('rpc' in supabase) {
        try {
          const { data: rpcCheck, error: rpcError } = await (supabase as any).rpc('is_provider', { user_id: resolvedUserId });
          if (!rpcError) {
            console.log('[Debug RLS] isProvider: RPC is_provider success. Status:', rpcCheck);
            return rpcCheck === true;
          }
          console.warn('[Debug RLS] isProvider: RPC is_provider failed:', rpcError);
        } catch (rpcErr) {
          console.warn('[Debug RLS] isProvider: Exception during RPC is_provider:', rpcErr);
        }
      } else {
        console.log('[Debug RLS] isProvider: supabase.rpc not available for is_provider call.');
      }
      
      // Méthode de dernier recours : requête directe sur la table profiles
      console.warn('[Debug RLS] isProvider: Falling back to direct query on profiles table for userId:', resolvedUserId);
      
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('is_provider')
        .eq('id', resolvedUserId); // Use resolvedUserId here
      
      if (error) {
        console.error('[Debug RLS] isProvider: ❌ Direct query error:', error);
        return false;
      }
      
      if (!data || data.length === 0) {
        console.warn('[Debug RLS] isProvider: ⚠️ No profile found in direct query for user:', resolvedUserId);
        return false;
      }
      
      const providerStatus = data[0]?.is_provider === true;
      console.log('[Debug RLS] isProvider: Direct query result for is_provider:', providerStatus);
      return providerStatus;
      
    } catch (err) {
      console.error('[Debug RLS] isProvider: ❌ Exception during provider status check logic:', err);
      return false;
    }
  } catch (err) {
    console.error('[Debug RLS] isProvider: ❌ Critical error in isProvider:', err);
    return false;
  }
};

// Vérifier si les migrations ont été appliquées
export const checkMigrationsApplied = async (): Promise<boolean> => {
  try {
    if (!supabase) {
      console.error('Client Supabase non initialisé');
      return false;
    }

    // Vérification de base de la table des migrations
    // On utilise une requête simple qui fonctionne avec le client de secours
    const result = await supabase.from('schema_migrations').select('version').limit(1);
    
    // Si on obtient une réponse (même vide), c'est que la table existe
    if (result && !result.error) {
      console.log('✅ Vérification des migrations : connexion à la base de données établie');
      return true;
    }
    
    return false;
    
  } catch (error: any) {
    // Erreur 42P01 = table inexistante
    if (error.code === '42P01') {
      console.warn('❌ Table des migrations non trouvée, vérifiez que les migrations ont été appliquées');
    } else {
      console.error('Erreur lors de la vérification des migrations:', error);
    }
    return false;
  }
};

// Fonction utilitaire pour vérifier les autorisations de facturation
export const checkInvoicePermissions = async (invoiceId: string): Promise<boolean> => {
  try {
    if (!supabase || !('rpc' in supabase)) {
      console.error('Client Supabase non initialisé ou méthode rpc non disponible');
      return false;
    }

    const { data, error } = await supabase.rpc('check_invoice_permissions', { 
      invoice_id: invoiceId 
    });
    
    if (error) {
      console.error('Erreur lors de la vérification des autorisations de facturation:', error);
      return false;
    }
    
    return data === true;
  } catch (err) {
    console.error('Exception lors de la vérification des autorisations de facturation:', err);
    return false;
  }
};

// Fonction utilitaire pour journaliser les actions importantes
export const logAuditAction = async (
  action: string,
  tableName: string,
  recordId: string,
  oldData?: Record<string, any> | null,
  newData?: Record<string, any> | null
): Promise<void> => {
  try {
    if (!supabase || !('rpc' in supabase)) {
      console.error('Client Supabase non initialisé ou méthode rpc non disponible');
      return;
    }

    await supabase.rpc('log_audit_action', {
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData ? JSON.stringify(oldData) : null,
      new_data: newData ? JSON.stringify(newData) : null,
    });
  } catch (err) {
    // Ne pas bloquer l'exécution si la journalisation échoue
    console.error("Erreur lors de la journalisation de l'audit:", err);
  }
};

// Interface pour les données de profil
interface ProfileData {
  id: string;
  nom?: string;
  email?: string;
  is_provider?: boolean;
  [key: string]: any;
}

interface ProviderProfileData {
  id: string;
  specialites?: string[];
  description?: string;
  [key: string]: any;
}

interface CombinedProfileData extends ProfileData {
  provider_profiles: ProviderProfileData[];
}

// Fonction utilitaire pour gérer les requêtes de profils avec gestion d'erreur améliorée
export const getProfileWithProviderData = async (userId: string): Promise<{
  data: any | null;
  error: any | null;
}> => {
  try {
    if (!supabase) {
      console.error('[Profile] Client Supabase non initialisé');
      return { data: null, error: { message: 'Client non initialisé' } };
    }

    // Vérification préalable pour les ID de test - Créer des profils réalistes
    if (userId === 'tg-2' || userId.startsWith('tg-')) {
      console.warn('[Profile] ID de test détecté:', userId, '- Retour de données simulées réalistes');
      
      // Profils de test variés selon l'ID - Prestataires africains
      const testProfiles = {
        'tg-2': {
          id: 'tg-2',
          full_name: 'Fatima Kone',
          business_name: 'Kone Design Studio',
          email: 'fatima.kone@floservice.com',
          phone: '+225 07 12 34 56 78',
          avatar_url: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=face',
          bio: 'Graphiste et web designer passionnée basée à Abidjan. Spécialisée dans l\'identité visuelle pour les entreprises africaines et les startups. Plus de 6 ans d\'expérience dans le design moderne et l\'accompagnement digital des PME ivoiriennes.',
          is_provider: true,
          city: 'Abidjan, Côte d\'Ivoire',
          website: 'https://kone-design.ci',
          languages: ['Français', 'Anglais', 'Dioula'],
          rating_average: 4.8,
          review_count: 145,
          banner_url: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=1200&h=400&fit=crop',
          social_links: {
            linkedin: 'https://linkedin.com/in/fatima-kone-design',
            behance: 'https://behance.net/fatima-kone',
            instagram: '@kone_design_ci'
          },
          response_time_hours: 2,
          status: 'available',
          provider_profiles: [{
            id: 'tg-2-provider',
            specialization: 'Design Graphique & Identité Visuelle',
            experience_years: 6,
            hourly_rate: 15000, // FCFA
            rating: 4.8,
            reviews_count: 145,
            description: 'Experte en design graphique et identité visuelle pour entreprises africaines',
            portfolio: [
              {
                title: 'Identité visuelle - Banque Atlantique CI',
                image: 'https://images.unsplash.com/photo-1559329007-40df8bf73b84?w=400&h=300&fit=crop',
                description: 'Création complète de l\'identité visuelle pour une institution bancaire ivoirienne'
              },
              {
                title: 'E-commerce - Mode Africaine Moderne',
                image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
                description: 'Plateforme de vente en ligne pour créateurs de mode africaine'
              },
              {
                title: 'Application - AgriTech Abidjan',
                image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=300&fit=crop',
                description: 'Interface utilisateur pour application d\'agriculture connectée'
              }
            ],
            certifications: ['Adobe Certified Expert', 'Google Africa Developer Scholarship'],
            skills: ['Photoshop', 'Illustrator', 'Figma', 'Branding Africain', 'UI/UX', 'Print Design']
          }]
        },
        'tg-3': {
          id: 'tg-3',
          full_name: 'Kwame Asante',
          business_name: 'Asante Tech Solutions',
          email: 'kwame.asante@floservice.com',
          phone: '+233 24 567 89 01',
          avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
          bio: 'Développeur Full-Stack spécialisé en solutions tech pour l\'Afrique. Expert React, Node.js et systèmes de paiement mobile. Accompagne les startups ghanéennes et ouest-africaines dans leur transformation digitale.',
          is_provider: true,
          city: 'Accra, Ghana',
          website: 'https://asantetech.gh',
          languages: ['Français', 'Anglais', 'Twi'],
          rating_average: 4.9,
          review_count: 98,
          provider_profiles: [{
            id: 'tg-3-provider',
            specialization: 'Développement Web & Mobile Money',
            experience_years: 5,
            hourly_rate: 12000, // FCFA
            rating: 4.9,
            reviews_count: 98,
            portfolio: [
              {
                title: 'Plateforme Mobile Money - GhanaPay',
                image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
                description: 'Application complète de transfert d\'argent mobile pour le Ghana'
              }
            ],
            skills: ['React', 'Node.js', 'TypeScript', 'Mobile Money API', 'PayStack', 'MongoDB']
          }]
        },
        'tg-4': {
          id: 'tg-4',
          full_name: 'Aminata Diallo',
          business_name: 'Diallo Communications',
          email: 'aminata.diallo@floservice.com',
          phone: '+221 77 123 45 67',
          avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
          bio: 'Consultante en marketing digital et communication pour PME sénégalaises. Spécialisée dans le marketing des réseaux sociaux et les stratégies de croissance pour le marché africain francophone.',
          is_provider: true,
          city: 'Dakar, Sénégal',
          website: 'https://diallo-comm.sn',
          languages: ['Français', 'Wolof', 'Anglais'],
          rating_average: 4.7,
          review_count: 76,
          provider_profiles: [{
            id: 'tg-4-provider',
            specialization: 'Marketing Digital & Communication',
            experience_years: 4,
            hourly_rate: 8000, // FCFA
            rating: 4.7,
            reviews_count: 76,
            portfolio: [
              {
                title: 'Campagne - Teranga Bank Sénégal',
                image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=300&fit=crop',
                description: 'Stratégie marketing digital pour banque sénégalaise'
              }
            ],
            skills: ['Facebook Ads', 'Google Ads', 'Content Marketing', 'Social Media', 'Analytics', 'Stratégie Digitale']
          }]
        },
        'tg-5': {
          id: 'tg-5',
          full_name: 'Moussa Traoré',
          business_name: 'Traoré Consulting IT',
          email: 'moussa.traore@floservice.com',
          phone: '+226 70 12 34 56',
          avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
          bio: 'Consultant IT et formateur en nouvelles technologies basé à Ouagadougou. Expert en transformation digitale des entreprises burkinabées et accompagnement dans l\'adoption des outils numériques.',
          is_provider: true,
          city: 'Ouagadougou, Burkina Faso',
          website: 'https://traore-it.bf',
          languages: ['Français', 'Mooré', 'Anglais'],
          rating_average: 4.6,
          review_count: 52,
          provider_profiles: [{
            id: 'tg-5-provider',
            specialization: 'Consulting IT & Formation',
            experience_years: 8,
            hourly_rate: 10000, // FCFA
            rating: 4.6,
            reviews_count: 52,
            portfolio: [
              {
                title: 'Formation - Orange Burkina Faso',
                image: 'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=400&h=300&fit=crop',
                description: 'Formation en outils numériques pour équipes Orange BF'
              }
            ],
            skills: ['Formation IT', 'Microsoft Office', 'Cybersécurité', 'Cloud Computing', 'Consulting', 'Gestion de Projet']
          }]
        }
      };

      const profileData = testProfiles[userId as keyof typeof testProfiles] || testProfiles['tg-2'];
      return { data: profileData, error: null };
    }

    // Requête séparée pour éviter les problèmes de JOIN - utiliser la vraie structure
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, business_name, email, phone, avatar_url, bio, website, languages, rating_average, review_count, city, banner_url, social_links, is_provider, response_time_hours, status')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('[Profile] Erreur lors de la vérification du profil:', profileError);
      return { data: null, error: profileError };
    }

    if (!profileData) {
      console.warn('[Profile] Aucun profil trouvé pour l\'ID:', userId);
      return { data: null, error: { message: 'Profil non trouvé', code: 'PROFILE_NOT_FOUND' } };
    }

    // Récupérer les données provider séparément (si la table existe et a des données)
    const { data: providerData, error: providerError } = await supabase
      .from('provider_profiles')
      .select('*')
      .eq('id', userId);

    // Ne pas lever d'erreur si les données provider ne sont pas trouvées (cas normal)
    if (providerError) {
      console.warn('[Profile] Pas de données provider trouvées pour:', userId, providerError.message);
    }

    // Mapper les données vers le format attendu par le composant avec gestion de type
    const mappedProviderData = (providerData as any[])?.map((provider: any) => ({
      id: provider.id || '',
      specialization: provider.specialization || provider.specialites?.[0] || '',
      experience_years: provider.experience_years || 0,
      hourly_rate: provider.hourly_rate || 0,
      rating: provider.rating || (profileData as any).rating_average || 0,
      reviews_count: provider.reviews_count || (profileData as any).review_count || 0,
      description: provider.description || '',
      portfolio: provider.portfolio || [],
      skills: provider.skills || [],
      certifications: provider.certifications || []
    })) || [];

    // Construire la réponse finale avec mapping des champs de la vraie base
    const result = Object.assign({}, profileData, {
      provider_profiles: mappedProviderData
    });

    return { data: result, error: null };

  } catch (error: any) {
    console.error('[Profile] Erreur critique lors de la récupération du profil:', error);
    
    // Gestion spécifique des erreurs courantes
    if (error.message?.includes('JWT expired') || error.message?.includes('invalid token')) {
      return { data: null, error: { message: 'Session expirée', code: 'AUTH_EXPIRED' } };
    }
    
    if (error.message?.includes('permission denied') || error.code === '42501') {
      return { data: null, error: { message: 'Accès non autorisé', code: 'ACCESS_DENIED' } };
    }

    return { data: null, error: error };
  }
};

// Fonction pour valider et normaliser les ID utilisateur
export const validateUserId = (userId: string | null | undefined): {
  isValid: boolean;
  normalizedId: string | null;
  isTestId: boolean;
} => {
  if (!userId || typeof userId !== 'string') {
    return { isValid: false, normalizedId: null, isTestId: false };
  }

  const trimmedId = userId.trim();
  
  // Vérifier si c'est un ID de test
  const isTestId = trimmedId.startsWith('tg-') || trimmedId === 'test' || trimmedId.startsWith('test-');
  
  // Les ID de test sont considérés comme valides pour le développement
  if (isTestId) {
    return { isValid: true, normalizedId: trimmedId, isTestId: true };
  }

  // Vérifier le format UUID pour les vrais ID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isValidUuid = uuidRegex.test(trimmedId);

  return { 
    isValid: isValidUuid, 
    normalizedId: isValidUuid ? trimmedId : null, 
    isTestId: false 
  };
};

// Note: Le client Supabase est déjà créé et exporté plus haut dans ce fichier
// Ne pas redéclarer les variables pour éviter les erreurs de compilation

// Exporter le client par défaut pour la compatibilité avec le code existant
export default supabase;