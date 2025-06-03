/**
 * API pour la gestion des données géographiques
 * Permet de récupérer les pays, villes et filtrer les prestataires par localisation
 */

import { supabase } from '../../lib/supabase-secure';

/**
 * Récupère tous les pays disponibles
 * @returns {Promise<Array>} Liste des pays
 */
export const getAllPays = async () => {
  try {
    const { data, error } = await supabase
      .from('pays')
      .select('id, nom')
      .order('nom');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des pays:', error);
    return [];
  }
};

/**
 * Récupère toutes les villes d'un pays donné
 * @param {number} paysId - ID du pays
 * @returns {Promise<Array>} Liste des villes du pays
 */
export const getVillesByPays = async (paysId) => {
  try {
    const { data, error } = await supabase
      .from('villes')
      .select('id, nom')
      .eq('pays_id', paysId)
      .order('nom');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Erreur lors de la récupération des villes du pays ${paysId}:`, error);
    return [];
  }
};

/**
 * Récupère les prestataires par ville
 * @param {number} villeId - ID de la ville
 * @returns {Promise<Array>} Liste des prestataires dans cette ville
 */
export const getPrestairesByVille = async (villeId) => {
  try {
    const { data, error } = await supabase
      .rpc('find_providers_by_city', { city_id: villeId });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Erreur lors de la récupération des prestataires de la ville ${villeId}:`, error);
    return [];
  }
};

/**
 * Récupère les prestataires par pays
 * @param {number} paysId - ID du pays
 * @returns {Promise<Array>} Liste des prestataires dans ce pays
 */
export const getPrestairesByPays = async (paysId) => {
  try {
    const { data, error } = await supabase
      .rpc('find_providers_by_country', { country_id: paysId });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Erreur lors de la récupération des prestataires du pays ${paysId}:`, error);
    return [];
  }
};

/**
 * Récupère les prestataires dans un rayon autour d'une ville
 * @param {number} villeId - ID de la ville centrale
 * @param {number} rayonKm - Rayon de recherche en kilomètres
 * @returns {Promise<Array>} Liste des prestataires dans le rayon avec distance
 */
export const getPrestairesByProximity = async (villeId, rayonKm = 50) => {
  try {
    const { data, error } = await supabase
      .rpc('find_providers_in_radius', { 
        city_id: villeId,
        radius_km: rayonKm
      });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Erreur lors de la recherche de prestataires dans un rayon de ${rayonKm}km autour de la ville ${villeId}:`, error);
    return [];
  }
};

/**
 * Récupère les villes dans un rayon autour d'une ville centrale
 * @param {number} villeId - ID de la ville centrale
 * @param {number} rayonKm - Rayon de recherche en kilomètres
 * @returns {Promise<Array>} Liste des villes dans le rayon avec distance
 */
export const getVillesByProximity = async (villeId, rayonKm = 50) => {
  try {
    const { data, error } = await supabase
      .rpc('find_cities_in_radius', { 
        city_id: villeId,
        radius_km: rayonKm
      });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Erreur lors de la recherche de villes dans un rayon de ${rayonKm}km autour de la ville ${villeId}:`, error);
    return [];
  }
};

/**
 * Met à jour la ville d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {number} villeId - ID de la ville
 * @returns {Promise<boolean>} Succès de l'opération
 */
export const updateUserVille = async (userId, villeId) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ ville_id: villeId })
      .eq('id', userId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Erreur lors de la mise à jour de la ville de l'utilisateur ${userId}:`, error);
    return false;
  }
};

/**
 * Récupère les informations géographiques complètes (pays + ville) d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} Informations géographiques de l'utilisateur
 */
export const getUserGeoInfo = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        ville_id,
        villes:ville_id (
          id,
          nom,
          pays:pays_id (
            id,
            nom
          )
        )
      `)
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    return {
      villeId: data.ville_id,
      villeNom: data.villes?.nom || null,
      paysId: data.villes?.pays?.id || null,
      paysNom: data.villes?.pays?.nom || null
    };
  } catch (error) {
    console.error(`Erreur lors de la récupération des infos géographiques de l'utilisateur ${userId}:`, error);
    return {
      villeId: null,
      villeNom: null,
      paysId: null,
      paysNom: null
    };
  }
};
