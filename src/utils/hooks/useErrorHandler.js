/**
 * Hook personnalisé pour la gestion centralisée des erreurs
 * Intègre le système de notification et la traduction des erreurs
 */

import { useCallback } from 'react';
import { useNotifier } from '../../components/ui/Notifier';

// Codes d'erreur Supabase et messages associés
const ERROR_MESSAGES = {
  // Erreurs d'authentification
  'auth/invalid-email': 'L\'adresse email est invalide.',
  'auth/user-disabled': 'Ce compte a été désactivé.',
  'auth/user-not-found': 'Aucun compte n\'existe avec cette adresse email.',
  'auth/wrong-password': 'Le mot de passe est incorrect.',
  'auth/email-already-in-use': 'Cette adresse email est déjà utilisée par un autre compte.',
  'auth/weak-password': 'Le mot de passe est trop faible. Utilisez au moins 8 caractères avec des lettres et des chiffres.',
  'auth/requires-recent-login': 'Cette opération nécessite une connexion récente. Veuillez vous reconnecter.',
  
  // Erreurs de base de données
  'PGRST116': 'La ressource demandée n\'existe pas.',
  '23505': 'Une entrée avec ces informations existe déjà.',
  '42P01': 'La table demandée n\'existe pas ou n\'est pas accessible.',
  '42703': 'La colonne demandée n\'existe pas.',
  '23503': 'Cette opération viole une contrainte de clé étrangère.',
  '23514': 'Cette opération viole une contrainte de vérification.',
  
  // Erreurs HTTP
  '400': 'Requête invalide. Vérifiez les données envoyées.',
  '401': 'Vous n\'êtes pas authentifié. Veuillez vous connecter.',
  '403': 'Vous n\'avez pas les droits nécessaires pour accéder à cette ressource.',
  '404': 'La ressource demandée n\'existe pas.',
  '406': 'Format de réponse non acceptable.',
  '409': 'Conflit avec l\'état actuel de la ressource.',
  '429': 'Trop de requêtes. Veuillez réessayer plus tard.',
  '500': 'Erreur serveur. Veuillez réessayer plus tard.',
  '503': 'Service temporairement indisponible. Veuillez réessayer plus tard.',
  
  // Erreurs réseau
  'network-error': 'Erreur de connexion. Vérifiez votre connexion internet.',
  'timeout': 'La requête a pris trop de temps. Veuillez réessayer.',
  
  // Erreur par défaut
  'default': 'Une erreur inattendue s\'est produite. Veuillez réessayer.'
};

/**
 * Fonction pour obtenir un message d'erreur convivial à partir d'une erreur
 * @param {Error|Object} error - L'erreur à traiter
 * @returns {string} - Message d'erreur convivial
 */
export const getErrorMessage = (error) => {
  if (!error) return ERROR_MESSAGES.default;
  
  // Si l'erreur est une chaîne, la retourner directement
  if (typeof error === 'string') return error;
  
  // Extraire le code d'erreur
  const errorCode = error.code || error.status || error.statusCode || error.error_code || 'default';
  
  // Vérifier si nous avons un message personnalisé pour ce code
  if (ERROR_MESSAGES[errorCode]) {
    return ERROR_MESSAGES[errorCode];
  }
  
  // Utiliser le message d'erreur s'il existe
  if (error.message) {
    return error.message;
  }
  
  // Message par défaut
  return ERROR_MESSAGES.default;
};

/**
 * Hook pour gérer les erreurs de manière centralisée
 * @returns {Object} Méthodes de gestion d'erreurs
 */
const useErrorHandler = () => {
  const notifier = useNotifier();

  /**
   * Traite une erreur et affiche une notification
   * @param {Error|Object} error - L'erreur à traiter
   * @param {Object} options - Options supplémentaires
   * @param {boolean} options.showNotification - Si true, affiche une notification (défaut: true)
   * @param {string} options.customMessage - Message personnalisé à afficher au lieu du message d'erreur traduit
   * @param {number} options.duration - Durée de la notification en ms
   */
  const handleError = useCallback((error, options = {}) => {
    const { 
      showNotification = true, 
      customMessage = null,
      duration = 5000
    } = options;
    
    // Journalisation de l'erreur dans la console pour le débogage
    console.error('Erreur interceptée:', error);
    
    // Obtenir un message d'erreur convivial
    const message = customMessage || getErrorMessage(error);
    
    // Afficher une notification si demandé
    if (showNotification && notifier) {
      notifier.error(message, duration);
    }
    
    return message;
  }, [notifier]);

  /**
   * Enveloppe une fonction asynchrone avec gestion d'erreur
   * @param {Function} asyncFunction - Fonction asynchrone à exécuter
   * @param {Object} options - Options de gestion d'erreur
   * @returns {Promise} Résultat de la fonction ou null en cas d'erreur
   */
  const withErrorHandling = useCallback(async (asyncFunction, options = {}) => {
    try {
      return await asyncFunction();
    } catch (error) {
      handleError(error, options);
      return null;
    }
  }, [handleError]);

  return {
    handleError,
    withErrorHandling,
    getErrorMessage
  };
};

export default useErrorHandler;