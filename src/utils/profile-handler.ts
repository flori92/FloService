/**
 * Gestionnaire de profils avec protection contre les erreurs 400
 * Résout le problème des requêtes malformées sur les profils avec ID inexistants
 */

import { getProfileWithProviderData, validateUserId } from '../lib/supabase-secure';

// Cache temporaire pour éviter les requêtes répétées sur des ID invalides
const invalidIdCache = new Set<string>();
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Nettoyer le cache périodiquement
setInterval(() => {
  invalidIdCache.clear();
  console.log('[ProfileHandler] Cache des ID invalides nettoyé');
}, CACHE_CLEANUP_INTERVAL);

export interface ProfileHandlerResult {
  success: boolean;
  data: any | null;
  error: string | null;
  cached?: boolean;
}

/**
 * Gestionnaire sécurisé pour récupérer un profil
 * Évite les erreurs 400 en validant les ID avant les requêtes
 */
export const safeGetProfile = async (userId: string): Promise<ProfileHandlerResult> => {
  try {
    // Vérification rapide du cache pour les ID déjà connus comme invalides
    if (invalidIdCache.has(userId)) {
      console.warn('[ProfileHandler] ID dans le cache des invalides:', userId);
      return {
        success: false,
        data: null,
        error: 'ID utilisateur invalide (mis en cache)',
        cached: true
      };
    }

    // Validation de l'ID
    const validation = validateUserId(userId);
    
    if (!validation.isValid) {
      console.warn('[ProfileHandler] ID utilisateur invalide:', userId);
      invalidIdCache.add(userId);
      return {
        success: false,
        data: null,
        error: 'Format d\'ID utilisateur invalide'
      };
    }

    // Pour les ID de test, retourner immédiatement des données simulées
    if (validation.isTestId) {
      console.log('[ProfileHandler] Retour de données simulées pour ID de test:', userId);
      return {
        success: true,
        data: {
          id: userId,
          nom: 'Utilisateur Test',
          email: 'test@floservice.com',
          is_provider: true,
          provider_profiles: [{
            id: userId + '-provider',
            specialites: ['Test'],
            description: 'Profil de test pour le développement'
          }]
        },
        error: null
      };
    }

    // Requête sécurisée vers Supabase
    const result = await getProfileWithProviderData(validation.normalizedId!);
    
    if (result.error) {
      // Si c'est une erreur 400 ou de format, mettre en cache
      if (result.error.code === 'PROFILE_NOT_FOUND' || 
          result.error.message?.includes('invalid') ||
          result.error.status === 400) {
        invalidIdCache.add(userId);
      }
      
      return {
        success: false,
        data: null,
        error: result.error.message || 'Erreur lors de la récupération du profil'
      };
    }

    return {
      success: true,
      data: result.data,
      error: null
    };

  } catch (error: any) {
    console.error('[ProfileHandler] Erreur critique:', error);
    
    // En cas d'erreur critique, ajouter l'ID au cache des invalides
    invalidIdCache.add(userId);
    
    return {
      success: false,
      data: null,
      error: error.message || 'Erreur inconnue'
    };
  }
};

/**
 * Gestionnaire pour les requêtes de profils en lot
 */
export const safeGetProfiles = async (userIds: string[]): Promise<{
  success: ProfileHandlerResult[];
  errors: string[];
}> => {
  const results: ProfileHandlerResult[] = [];
  const errors: string[] = [];

  // Traiter chaque ID de manière séquentielle pour éviter de surcharger l'API
  for (const userId of userIds) {
    try {
      const result = await safeGetProfile(userId);
      results.push(result);
      
      if (!result.success) {
        errors.push(`${userId}: ${result.error}`);
      }
    } catch (error: any) {
      const errorResult: ProfileHandlerResult = {
        success: false,
        data: null,
        error: error.message || 'Erreur inconnue'
      };
      results.push(errorResult);
      errors.push(`${userId}: ${error.message}`);
    }

    // Petit délai pour éviter de surcharger l'API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { success: results, errors };
};

/**
 * Vider le cache des ID invalides (utile pour les tests ou après des mises à jour)
 */
export const clearInvalidIdCache = (): void => {
  invalidIdCache.clear();
  console.log('[ProfileHandler] Cache des ID invalides vidé manuellement');
};

/**
 * Obtenir le statut du cache
 */
export const getCacheStatus = (): {
  invalidIdCount: number;
  invalidIds: string[];
} => {
  return {
    invalidIdCount: invalidIdCache.size,
    invalidIds: Array.from(invalidIdCache)
  };
};
