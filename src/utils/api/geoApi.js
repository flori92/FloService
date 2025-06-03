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
 * @param {string} paysCode - Code du pays (ex: 'BJ', 'CM')
 * @returns {Promise<Array>} Liste des villes du pays
 */
export const getVillesByPays = async (paysCode) => {
  try {
    // Vérifier si le code du pays est valide
    if (!paysCode || typeof paysCode !== 'string' || paysCode.length !== 2) {
      console.warn('Code pays invalide:', paysCode);
      return [];
    }

    // Essayer d'abord avec pays_code
    let { data, error } = await supabase
      .from('villes')
      .select('id, nom')
      .eq('pays_code', paysCode)
      .order('nom', { ascending: true });
    
    if (error) {
      console.warn(`Erreur avec pays_code pour ${paysCode}:`, error);
      // Essayer avec pays_id comme fallback (si le code est un ID numérique)
      if (!isNaN(parseInt(paysCode))) {
        const result = await supabase
          .from('villes')
          .select('id, nom')
          .eq('pays_id', parseInt(paysCode))
          .order('nom', { ascending: true });
        
        data = result.data;
        error = result.error;
      }
    }
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      // Utiliser des données mockées pour les pays sans villes
      console.log(`Utilisation de la liste de villes par défaut pour ${paysCode}`);
      return getDefaultCitiesForCountry(paysCode);
    }
    
    return data;
  } catch (error) {
    console.error(`Erreur lors de la récupération des villes pour ${paysCode}:`, error);
    throw new Error(`Aucune ville disponible pour ce pays`);
  }
};

/**
 * Retourne une liste de villes par défaut pour un pays donné
 * @param {string} countryCode - Code du pays
 * @returns {Array} Liste des villes par défaut
 */
const getDefaultCitiesForCountry = (countryCode) => {
  const defaultCities = {
    'BJ': [
      { id: 'cotonou-bj', nom: 'Cotonou' },
      { id: 'porto-novo-bj', nom: 'Porto-Novo' },
      { id: 'parakou-bj', nom: 'Parakou' },
      { id: 'abomey-calavi-bj', nom: 'Abomey-Calavi' },
      { id: 'djougou-bj', nom: 'Djougou' }
    ],
    'CM': [
      { id: 'douala-cm', nom: 'Douala' },
      { id: 'yaounde-cm', nom: 'Yaoundé' },
      { id: 'garoua-cm', nom: 'Garoua' },
      { id: 'bamenda-cm', nom: 'Bamenda' },
      { id: 'maroua-cm', nom: 'Maroua' }
    ],
    'BF': [
      { id: 'ouagadougou-bf', nom: 'Ouagadougou' },
      { id: 'bobo-dioulasso-bf', nom: 'Bobo-Dioulasso' },
      { id: 'koudougou-bf', nom: 'Koudougou' },
      { id: 'banfora-bf', nom: 'Banfora' },
      { id: 'ouahigouya-bf', nom: 'Ouahigouya' }
    ],
    'GA': [
      { id: 'libreville-ga', nom: 'Libreville' },
      { id: 'port-gentil-ga', nom: 'Port-Gentil' },
      { id: 'franceville-ga', nom: 'Franceville' },
      { id: 'oyem-ga', nom: 'Oyem' },
      { id: 'lambarene-ga', nom: 'Lambaréné' }
    ]
  };
  
  return defaultCities[countryCode] || [];
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
