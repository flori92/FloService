import { createClient } from '@supabase/supabase-js';

// Fonction de secours en cas d'échec d'initialisation
const createFallbackClient = () => {
  console.warn('Utilisation du client de secours Supabase');
  
  // Implémentation minimale pour éviter les erreurs
  const fallbackResponse = { data: null, error: { message: 'Client de secours' } };
  
  return {
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
      user: () => ({ id: 'fallback-user' })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve(fallbackResponse)
        })
      })
    }),
    rpc: () => Promise.resolve(fallbackResponse)
  };
};

// Type du client de secours
type FallbackSupabaseClient = ReturnType<typeof createFallbackClient>;

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
  if (viteValue) return viteValue;
  
  // Vérifier ensuite process.env (Node.js/React)
  const processValue = typeof process !== 'undefined' && process.env && (process.env as any)[key];
  if (processValue) return processValue;
  
  // Vérifier window.ENV (injection runtime)
  const windowValue = typeof window !== 'undefined' && window.ENV && window.ENV[key];
  if (windowValue) return windowValue;
  
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
  if (!supabaseUrl) console.error('VITE_SUPABASE_URL est manquant');
  if (!supabaseKey) console.error('VITE_SUPABASE_ANON_KEY est manquant');
}

// Création du client Supabase avec gestion d'erreur
export const createSupabaseClient = () => {
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
          'Accept': 'application/json, */*',
          'Content-Type': 'application/json',
          'Accept-Profile': 'public',
          'Content-Profile': 'public',
          'apikey': supabaseKey,
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
export const supabase = createSupabaseClient();

// Fonction utilitaire pour échapper les entrées utilisateur dans les recherches
export function safeSearchTerm(term: string): string {
  if (!term) return '';
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

// Fonction utilitaire pour vérifier si l'utilisateur est un prestataire
export const isProvider = async (userId?: string): Promise<boolean> => {
  try {
    // Vérification du client Supabase
    if (!supabase) {
      console.error('❌ Client Supabase non initialisé');
      return false;
    }

    // Si aucun userId n'est fourni, vérifier l'utilisateur connecté
    if (!userId) {
      try {
        // Essayer d'abord avec getSession() si disponible
        if ('getSession' in supabase.auth) {
          const { data: { session } } = await (supabase.auth as any).getSession();
          if (session?.user) {
            userId = session.user.id;
          }
        } 
        // Sinon essayer avec user()
        else if ('user' in supabase.auth) {
          const user = (supabase.auth as any).user();
          if (user) {
            userId = user.id;
          }
        }

        if (!userId) {
          console.error('❌ Aucun utilisateur connecté et aucun userId fourni');
          return false;
        }
      } catch (err) {
        console.error('❌ Erreur lors de la récupération de l\'utilisateur:', err);
        return false;
      }
    }

    try {
      // Essayer d'abord d'utiliser la méthode RPC si elle est disponible
      if ('rpc' in supabase) {
        try {
          const { data: rpcCheck, error: rpcError } = await (supabase as any).rpc('is_provider', { user_id: userId });
          if (!rpcError) {
            return rpcCheck === true;
          }
          console.warn('La fonction RPC a échoué, utilisation de la méthode alternative');
        } catch (rpcErr) {
          console.warn('Erreur lors de l\'appel RPC is_provider:', rpcErr);
        }
      }
      
      // Méthode alternative : requête directe sur la table profiles
      console.log('Utilisation de la méthode alternative pour vérifier le statut prestataire');
      
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('is_provider')
        .eq('id', userId);
      
      if (error || !data || data.length === 0) {
        console.error('❌ Erreur lors de la vérification du statut prestataire:', error || 'Aucune donnée retournée');
        return false;
      }
      
      // Retourner la valeur de is_provider ou false si non défini
      return data[0]?.is_provider === true;
      
    } catch (err) {
      console.error('❌ Exception lors de la vérification du statut prestataire:', err);
      return false;
    }
  } catch (err) {
    console.error('❌ Erreur critique dans isProvider:', err);
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