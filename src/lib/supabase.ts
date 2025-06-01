import { createClient } from '@supabase/supabase-js';

// Définition des types de base pour Supabase
// Ces types seront remplacés par la génération automatique des types via Supabase CLI
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Type simplifié pour la base de données
// À remplacer par les types générés via Supabase CLI
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

// Récupération des variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Vérification de la présence des variables d'environnement
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Les variables d'environnement Supabase sont manquantes");
  throw new Error("Configuration Supabase incomplète");
}

// Options de configuration sécurisées
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
};

// Création du client Supabase typé
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  supabaseOptions
);

// Fonction utilitaire pour échapper les entrées utilisateur dans les recherches
export const safeSearchTerm = (term: string): string => {
  if (!term) return '';
  
  // Échapper les caractères spéciaux pour éviter les injections SQL
  return term
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "''");
};

// Fonction utilitaire pour vérifier si l'utilisateur est un prestataire
export const isProvider = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('is_provider');
    
    if (error) {
      console.error('Erreur lors de la vérification du statut prestataire:', error);
      return false;
    }
    
    return data === true;
  } catch (err) {
    console.error('Exception lors de la vérification du statut prestataire:', err);
    return false;
  }
};

// Fonction utilitaire pour vérifier les autorisations de facturation
export const checkInvoicePermissions = async (invoiceId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('check_invoice_permissions', { invoice_id: invoiceId });
    
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
