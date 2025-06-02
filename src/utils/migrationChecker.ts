/**
 * Utilitaire pour vérifier si les migrations Supabase ont été appliquées
 * et gérer les erreurs liées aux tables manquantes
 * Créé le 02/06/2025
 */

import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// Liste des tables essentielles pour le fonctionnement de l'application
const ESSENTIAL_TABLES = [
  'profiles',
  'provider_profiles',
  'messages',
  'conversations',
  'notifications',
  'pays',
  'villes'
];

// Liste des tables utilisées par le système de messagerie
const MESSAGING_TABLES = [
  'messages',
  'conversations',
  'external_id_mapping'
];

// Interface pour le résultat de la vérification
interface MigrationCheckResult {
  status: 'ok' | 'migration_required';
  missingTables: string[];
  missingFunctions: string[];
}

/**
 * Vérifie si une table existe dans Supabase
 * @param tableName Nom de la table à vérifier
 * @returns true si la table existe, false sinon
 */
export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        // Table inexistante (erreur PostgreSQL 42P01)
        console.warn(`Table '${tableName}' n'existe pas dans Supabase`);
        return false;
      } else {
        // Autre erreur (probablement liée aux permissions)
        console.error(`Erreur lors de la vérification de la table '${tableName}':`, error.message);
        return true; // On suppose que la table existe mais qu'on n'a pas les permissions
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Exception lors de la vérification de la table '${tableName}':`, error);
    return false;
  }
}

/**
 * Vérifie si une fonction RPC existe dans Supabase
 * @param functionName Nom de la fonction à vérifier
 * @returns true si la fonction existe, false sinon
 */
export async function checkRpcFunctionExists(functionName: string): Promise<boolean> {
  try {
    // Utiliser un UUID test pour éviter les erreurs de validation
    const testId = '00000000-0000-0000-0000-000000000000';
    
    const { data, error } = await supabase
      .rpc(functionName, { user_id: testId });
    
    if (error) {
      if (error.code === '42883') { // Function does not exist
        console.warn(`Fonction RPC '${functionName}' n'existe pas dans Supabase`);
        return false;
      } else if (error.code === '22P02') { // Invalid input syntax (expected for UUID validation)
        return true; // La fonction existe mais l'UUID est invalide (comportement normal)
      } else {
        // Autre erreur (probablement liée aux permissions)
        console.error(`Erreur lors de la vérification de la fonction '${functionName}':`, error.message);
        return true; // On suppose que la fonction existe mais qu'on n'a pas les permissions
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Exception lors de la vérification de la fonction '${functionName}':`, error);
    return false;
  }
}

/**
 * Vérifie si les migrations Supabase ont été appliquées
 * @returns Résultat de la vérification
 */
export async function checkMigrationStatus(): Promise<MigrationCheckResult> {
  const result: MigrationCheckResult = {
    status: 'ok',
    missingTables: [],
    missingFunctions: []
  };
  
  // Vérification des tables essentielles
  for (const table of ESSENTIAL_TABLES) {
    const exists = await checkTableExists(table);
    if (!exists) {
      result.missingTables.push(table);
    }
  }
  
  // Vérification des fonctions RPC essentielles
  const essentialFunctions = ['is_provider', 'get_provider_status'];
  for (const func of essentialFunctions) {
    const exists = await checkRpcFunctionExists(func);
    if (!exists) {
      result.missingFunctions.push(func);
    }
  }
  
  // Mise à jour du statut global
  if (result.missingTables.length > 0 || result.missingFunctions.length > 0) {
    result.status = 'migration_required';
  }
  
  return result;
}

/**
 * Vérifie si le système de messagerie est disponible
 * @returns true si le système de messagerie est disponible, false sinon
 */
export async function isMessagingSystemAvailable(): Promise<boolean> {
  for (const table of MESSAGING_TABLES) {
    const exists = await checkTableExists(table);
    if (!exists) {
      return false;
    }
  }
  
  return true;
}

/**
 * Vérifie si un ID est au format UUID valide
 * @param id ID à vérifier
 * @returns true si l'ID est un UUID valide, false sinon
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Vérifie si un ID est un ID de test (format tg-X)
 * @param id ID à vérifier
 * @returns true si l'ID est un ID de test, false sinon
 */
export function isTestId(id: string): boolean {
  return /^tg-\d+$/.test(id);
}

/**
 * Nettoie un ID pour les requêtes Supabase
 * @param id ID à nettoyer
 * @returns ID nettoyé ou null si l'ID n'est pas valide
 */
export function cleanIdForSupabase(id: string | null | undefined): string | null {
  if (!id) return null;
  
  // Si c'est un UUID valide, on le retourne tel quel
  if (isValidUUID(id)) {
    return id;
  }
  
  // Si c'est un ID de test, on le retourne tel quel (pour les tests)
  if (isTestId(id)) {
    return id;
  }
  
  // Sinon, on retourne null (ID invalide)
  console.warn(`ID invalide pour Supabase: ${id}`);
  return null;
}

/**
 * Vérifie si un ID est valide pour Supabase (UUID ou ID de test)
 * @param id ID à vérifier
 * @returns true si l'ID est valide pour Supabase, false sinon
 */
export function isValidSupabaseId(id: string | null | undefined): boolean {
  if (!id) return false;
  return isValidUUID(id) || isTestId(id);
}

/**
 * Génère un ID de test pour les environnements de développement
 * @param baseId Identifiant de base (numérique)
 * @returns ID de test au format tg-X
 */
export function generateTestId(baseId: number): string {
  return `tg-${baseId}`;
}

/**
 * Affiche une notification pour informer l'utilisateur que les migrations sont requises
 */
export function showMigrationRequiredNotification(): void {
  toast.error(
    "La base de données nécessite une mise à jour. Certaines fonctionnalités peuvent être indisponibles.",
    {
      duration: 10000,
      id: 'migration-required'
    }
  );
}

/**
 * Interface pour le résultat du traitement d'erreur Supabase
 */
export interface SupabaseErrorResult {
  isMigrationError: boolean;
  message: string;
}

/**
 * Interface pour les données de profil prestataire
 */
export interface ProviderProfileData {
  id: string;
  user_id?: string;
  full_name: string;
  avatar_url?: string;
  specialty?: string;
  experience_years?: number;
  hourly_rate?: number;
  rating?: number;
  location?: string;
  bio?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Génère des données de test pour un profil prestataire
 * Utile pour le mode fallback lorsque les tables n'existent pas
 * @param id Identifiant du prestataire (peut être un ID de test)
 * @returns Données de profil prestataire simulées
 */
export function generateTestProviderData(id: string): ProviderProfileData {
  // Extraire le numéro de l'ID de test si possible
  let numericId = 1;
  if (isTestId(id)) {
    const match = id.match(/tg-(\d+)/);
    if (match && match[1]) {
      numericId = parseInt(match[1], 10);
    }
  }
  
  // Générer des données cohérentes basées sur l'ID
  const specialties = ['Plomberie', 'Electricité', 'Menuiserie', 'Jardinage', 'Informatique'];
  const locations = ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Lille'];
  const names = ['Martin Dupont', 'Sophie Lefebvre', 'Thomas Bernard', 'Julie Laurent', 'Nicolas Petit'];
  
  // Utiliser l'ID pour déterminer les valeurs de manière déterministe
  const specialtyIndex = numericId % specialties.length;
  const locationIndex = numericId % locations.length;
  const nameIndex = numericId % names.length;
  
  return {
    id: id,
    user_id: id,
    full_name: names[nameIndex],
    avatar_url: `https://i.pravatar.cc/150?u=${id}`,
    specialty: specialties[specialtyIndex],
    experience_years: (numericId % 10) + 1,
    hourly_rate: (numericId % 5) * 10 + 30,
    rating: ((numericId % 5) + 1) / 1.0,
    location: locations[locationIndex],
    bio: `Prestataire professionnel avec expérience en ${specialties[specialtyIndex]}.`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Vérifie si les tables requises pour une fonctionnalité spécifique existent
 * @param requiredTables Liste des tables requises
 * @returns Promise<boolean> true si toutes les tables existent, false sinon
 */
export async function checkRequiredTables(requiredTables: string[]): Promise<boolean> {
  for (const table of requiredTables) {
    const exists = await checkTableExists(table);
    if (!exists) {
      console.warn(`Table requise manquante: ${table}`);
      return false;
    }
  }
  return true;
}

/**
 * Gère une erreur Supabase et détermine si elle est liée à une migration manquante
 * @param error Erreur Supabase
 * @returns Objet avec isMigrationError et message
 */
export function handleSupabaseError(error: any): SupabaseErrorResult {
  if (!error) return { isMigrationError: false, message: 'Aucune erreur' };
  
  console.error('Erreur Supabase:', error.message, error.code);
  
  // Vérification des codes d'erreur spécifiques aux tables manquantes
  if (error.code === '42P01') { // relation does not exist
    showMigrationRequiredNotification();
    return { 
      isMigrationError: true, 
      message: 'Table manquante dans la base de données. Migration requise.' 
    };
  }
  
  // Vérification des codes d'erreur spécifiques aux fonctions manquantes
  if (error.code === '42883') { // function does not exist
    showMigrationRequiredNotification();
    return { 
      isMigrationError: true, 
      message: 'Fonction manquante dans la base de données. Migration requise.' 
    };
  }
  
  // Erreur 406 (Not Acceptable) peut indiquer un problème avec les en-têtes Accept
  if (error.status === 406) {
    toast.error("Erreur de communication avec le serveur. Rafraîchissez la page.", {
      duration: 5000
    });
    return { 
      isMigrationError: false, 
      message: 'Erreur de communication avec le serveur (406).' 
    };
  }
  
  // Erreur 400 (Bad Request) peut indiquer un problème avec les paramètres
  if (error.status === 400) {
    // Vérifier si l'erreur est liée à un UUID invalide
    if (error.message && error.message.includes('invalid input syntax for type uuid')) {
      // Vérifier si nous sommes en environnement de développement pour accepter les IDs de test
      const isDev = process.env.NODE_ENV === 'development' || 
                   process.env.EXPO_PUBLIC_ENVIRONMENT === 'development';
      
      if (isDev) {
        console.warn("ID non-UUID détecté en environnement de développement. Utilisation du mode fallback.");
        return { 
          isMigrationError: false, 
          message: 'ID non-UUID en environnement de développement. Mode fallback activé.' 
        };
      } else {
        toast.error("Identifiant invalide. Vérifiez l'URL et réessayez.", {
          duration: 5000
        });
        return { 
          isMigrationError: false, 
          message: 'Identifiant invalide. Format UUID requis.' 
        };
      }
    }
  }
  
  // Erreur générique
  toast.error("Une erreur est survenue. Veuillez réessayer plus tard.", {
    duration: 5000
  });
  
  return { 
    isMigrationError: false, 
    message: error.message || 'Erreur inconnue' 
  };
}
