/**
 * Hook personnalisé pour la gestion centralisée des erreurs
 * Intègre le système de notification et la traduction des erreurs
 */

import { useCallback } from 'react';
import { useNotifier } from '../../components/ui/Notifier';
import { getErrorMessage } from '../errorHandler';

/**
 * Hook pour gérer les erreurs de manière centralisée
 * @returns {Object} Méthodes de gestion d'erreurs
 */
export const useErrorHandler = () => {
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
