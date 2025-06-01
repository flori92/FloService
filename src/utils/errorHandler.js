/**
 * Utilitaire pour gérer les erreurs API de manière centralisée
 * Améliore l'expérience utilisateur en fournissant des messages d'erreur clairs et des solutions
 */

import { useNotifier } from '../components/ui/Notifier';

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
 * Fonction pour gérer les erreurs Supabase
 * @param {Error|Object} error - L'erreur à traiter
 * @param {Function} notifier - Fonction pour afficher une notification
 * @returns {string} - Message d'erreur convivial
 */
export const handleSupabaseError = (error, notifier = null) => {
  const message = getErrorMessage(error);
  
  // Afficher une notification si le notifier est fourni
  if (notifier) {
    notifier.error(message);
  }
  
  // Logger l'erreur pour le débogage
  console.error('Erreur Supabase:', error);
  
  return message;
};

/**
 * Hook pour utiliser le gestionnaire d'erreurs
 * @returns {Object} - Fonctions pour gérer les erreurs
 */
export const useErrorHandler = () => {
  const notifier = useNotifier();
  
  return {
    /**
     * Gère une erreur et affiche une notification
     * @param {Error|Object} error - L'erreur à traiter
     * @returns {string} - Message d'erreur convivial
     */
    handleError: (error) => handleSupabaseError(error, notifier),
    
    /**
     * Gère une erreur sans afficher de notification
     * @param {Error|Object} error - L'erreur à traiter
     * @returns {string} - Message d'erreur convivial
     */
    getErrorMessage
  };
};

<<<<<<< HEAD

=======
>>>>>>> 5c5a112 (✨ [FEAT] Ajout de la recherche par proximité géographique et mise à jour du texte de présentation)
/**
 * Fonction pour effectuer une opération sécurisée sur une table
 * @param {Object} supabase - Client Supabase
 * @param {string} tableName - Nom de la table
 * @param {Function} operation - Fonction à exécuter si la table existe
 * @param {Function} fallback - Fonction à exécuter si la table n'existe pas
 * @returns {Promise<any>} - Résultat de l'opération ou du fallback
 */
export const safeTableOperation = async (supabase, tableName, operation, fallback = () => ({ data: null, error: null })) => {
  try {
    return await operation();
  } catch (error) {
    // Si l'erreur indique une absence de table, utiliser le fallback
    if (error && error.message && error.message.includes('does not exist')) {
      return fallback();
    }
    throw error;
  }
};

export default {
  getErrorMessage,
  handleSupabaseError,
  useErrorHandler,

  safeTableOperation
};
