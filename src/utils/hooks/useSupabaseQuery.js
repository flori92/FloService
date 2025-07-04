/**
 * Hook personnalisé pour gérer les requêtes Supabase avec gestion d'état et d'erreurs
 * Améliore l'expérience utilisateur en gérant automatiquement les états de chargement et d'erreur
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase.ts';
import { useNotifier } from '../../components/ui/Notifier.jsx';
import useErrorHandler from './useErrorHandler.js';

/**
 * Hook pour effectuer des requêtes Supabase avec gestion d'état
 * @param {Function} queryFn - Fonction qui retourne une promesse (requête Supabase)
 * @param {Object} options - Options de configuration
 * @param {boolean} options.enabled - Si false, la requête ne sera pas exécutée automatiquement
 * @param {boolean} options.refetchOnMount - Si true, la requête sera exécutée à chaque montage
 * @param {number} options.refetchInterval - Intervalle en ms pour rafraîchir automatiquement les données
 * @param {boolean} options.showErrorNotification - Si true, affiche une notification en cas d'erreur
 * @param {Function} options.onSuccess - Callback appelé en cas de succès
 * @param {Function} options.onError - Callback appelé en cas d'erreur
 * @returns {Object} - État de la requête et fonctions utilitaires
 */
const useSupabaseQuery = (queryFn, {
  enabled = true,
  refetchOnMount = true,
  refetchInterval = 0,
  showErrorNotification = true,
  onSuccess = () => {},
  onError = () => {}
} = {}) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const notifier = useNotifier();
  const { getErrorMessage } = useErrorHandler();

  // Fonction pour exécuter la requête
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    } else {
      setIsRefetching(true);
    }
    
    setError(null);
    
    try {
      const result = await queryFn();
      
      if (result.error) {
        throw result.error;
      }
      
      setData(result.data);
      onSuccess(result.data);
      return result.data;
    } catch (err) {
      setError(err);
      onError(err);
      
      if (showErrorNotification) {
        notifier.error(
          getErrorMessage(err) || 'Une erreur est survenue lors de la récupération des données'
        );
      }
      
      return null;
    } finally {
      if (showLoading) {
        setIsLoading(false);
      } else {
        setIsRefetching(false);
      }
    }
  }, [queryFn, onSuccess, onError, showErrorNotification, notifier, getErrorMessage]);

  // Fonction pour rafraîchir les données
  const refetch = useCallback(() => {
    return fetchData(false);
  }, [fetchData]);

  // Exécuter la requête au montage si enabled est true
  useEffect(() => {
    if (enabled && refetchOnMount) {
      fetchData();
    }
  }, [enabled, refetchOnMount, fetchData]);

  // Configurer le rafraîchissement automatique si refetchInterval > 0
  useEffect(() => {
    if (!refetchInterval || !enabled) return;
    
    const intervalId = setInterval(() => {
      refetch();
    }, refetchInterval);
    
    return () => clearInterval(intervalId);
  }, [refetchInterval, refetch, enabled]);

  return {
    data,
    error,
    isLoading,
    isRefetching,
    refetch,
    isError: !!error,
    isSuccess: !!data && !error
  };
};

/**
 * Hook pour effectuer une requête RPC Supabase
 * @param {string} functionName - Nom de la fonction RPC
 * @param {Object} params - Paramètres à passer à la fonction
 * @param {Object} options - Options de configuration pour useSupabaseQuery
 */
export const useSupabaseRpc = (functionName, params = {}, options = {}) => {
  const queryFn = useCallback(() => {
    try {
      return supabase.rpc(functionName, params);
    } catch (error) {
      console.error(`Erreur lors de l'appel RPC ${functionName}:`, error);
      return { data: null, error };
    }
  }, [functionName, params]);
  
  return useSupabaseQuery(queryFn, options);
};

/**
 * Hook pour effectuer une requête SELECT Supabase
 * @param {string} table - Nom de la table
 * @param {Object} queryOptions - Options de requête (select, eq, order, etc.)
 * @param {Object} options - Options de configuration pour useSupabaseQuery
 */
export const useSupabaseSelect = (table, queryOptions = {}, options = {}) => {
  const { 
    select = '*', 
    eq = null,
    order = null,
    limit = null,
    range = null,
    filter = null,
    ...otherOptions 
  } = queryOptions;
  
  const queryFn = useCallback(() => {
    try {
      let query = supabase.from(table).select(select);
      
      // Appliquer les filtres d'égalité
      if (eq) {
        Object.entries(eq).forEach(([column, value]) => {
          query = query.eq(column, value);
        });
      }
      
      // Appliquer l'ordre
      if (order) {
        const { column, ascending = true } = order;
        query = query.order(column, { ascending });
      }
      
      // Appliquer la limite
      if (limit) {
        query = query.limit(limit);
      }
      
      // Appliquer la plage
      if (range) {
        const { from, to } = range;
        query = query.range(from, to);
      }
      
      // Appliquer un filtre personnalisé
      if (filter && typeof filter === 'function') {
        query = filter(query);
      }
      
      return query;
    } catch (error) {
      console.error(`Erreur lors de la requête SELECT sur ${table}:`, error);
      return { data: null, error };
    }
  }, [table, select, eq, order, limit, range, filter, otherOptions]);
  
  return useSupabaseQuery(queryFn, options);
};

/**
 * Hook pour effectuer une mutation Supabase (INSERT, UPDATE, DELETE)
 * @param {string} table - Nom de la table
 * @param {string} operation - Type d'opération ('insert', 'update', 'delete')
 * @param {Object} options - Options de configuration
 */
export const useSupabaseMutation = (table, operation, options = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const notifier = useNotifier();
  const { getErrorMessage } = useErrorHandler();
  
  const {
    onSuccess = () => {},
    onError = () => {},
    showSuccessNotification = true,
    showErrorNotification = true,
    successMessage = 'Opération réussie',
  } = options;
  
  const mutate = useCallback(async (payload, queryOptions = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let query;
      
      switch (operation) {
        case 'insert':
          query = supabase.from(table).insert(payload);
          break;
        case 'update':
          query = supabase.from(table).update(payload);
          
          // Appliquer les filtres pour l'update
          if (queryOptions.eq) {
            Object.entries(queryOptions.eq).forEach(([column, value]) => {
              query = query.eq(column, value);
            });
          }
          break;
        case 'delete':
          query = supabase.from(table).delete();
          
          // Appliquer les filtres pour le delete
          if (queryOptions.eq) {
            Object.entries(queryOptions.eq).forEach(([column, value]) => {
              query = query.eq(column, value);
            });
          }
          break;
        default:
          throw new Error(`Opération non supportée: ${operation}`);
      }
      
      const { data: result, error: resultError } = await query;
      
      if (resultError) {
        throw resultError;
      }
      
      setData(result);
      onSuccess(result);
      
      if (showSuccessNotification) {
        notifier.success(successMessage);
      }
      
      return result;
    } catch (err) {
      setError(err);
      onError(err);
      
      if (showErrorNotification) {
        notifier.error(
          getErrorMessage(err) || 'Une erreur est survenue lors de l\'opération'
        );
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [table, operation, onSuccess, onError, showSuccessNotification, showErrorNotification, successMessage, notifier, getErrorMessage]);
  
  return {
    mutate,
    isLoading,
    error,
    data,
    isError: !!error,
    isSuccess: !!data && !error,
    reset: () => {
      setData(null);
      setError(null);
    }
  };
};

export default useSupabaseQuery;