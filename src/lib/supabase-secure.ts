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
        detectSessionInUrl: true,
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
          'Authorization': `Bearer ${supabaseKey}`,
          'X-Client-Info': 'FloService Web Client',
          'Prefer': 'return=representation',
        },
      },
      // Le schéma est défini directement dans le type Database
    } as const; // Utilisation de 'as const' pour le typage littéral

    // Vérification de la connexion au démarrage
    const checkInitialConnection = async () => {
      try {
        const { data, error } = await supabaseInstance
          .from('profiles')
          .select('*')
          .limit(1);
          
        if (error) {
          console.error('❌ Erreur de connexion initiale à Supabase:', error);
          return false;
        }
        console.log('✅ Connexion à Supabase établie avec succès');
        return true;
      } catch (err) {
        console.error('❌ Erreur lors de la vérification de la connexion Supabase:', err);
        return false;
      }
    };

    // Création du client Supabase typé
    const supabaseInstance = createClient<Database>(
      supabaseUrl,
      supabaseKey,
      supabaseOptions
    );

    // Exécuter la vérification de connexion au chargement
    if (typeof window !== 'undefined') {
      checkInitialConnection();
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
    const result = await supabase.from('migrations').select('*');
    
    // Si on obtient une réponse (même vide), c'est que la table existe
    if (result) {
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

// Exporter le client par défaut
export default supabase;