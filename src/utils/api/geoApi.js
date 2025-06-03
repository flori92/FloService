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
      { id: 'djougou-bj', nom: 'Djougou' },
      { id: 'bohicon-bj', nom: 'Bohicon' },
      { id: 'natitingou-bj', nom: 'Natitingou' },
      { id: 'lokossa-bj', nom: 'Lokossa' },
      { id: 'ouidah-bj', nom: 'Ouidah' },
      { id: 'aplahoue-bj', nom: 'Aplahoué' }
    ],
    'CM': [
      { id: 'douala-cm', nom: 'Douala' },
      { id: 'yaounde-cm', nom: 'Yaoundé' },
      { id: 'garoua-cm', nom: 'Garoua' },
      { id: 'bamenda-cm', nom: 'Bamenda' },
      { id: 'maroua-cm', nom: 'Maroua' },
      { id: 'bafoussam-cm', nom: 'Bafoussam' },
      { id: 'ngaoundere-cm', nom: 'Ngaoundéré' },
      { id: 'bertoua-cm', nom: 'Bertoua' },
      { id: 'loum-cm', nom: 'Loum' },
      { id: 'kumba-cm', nom: 'Kumba' }
    ],
    'BF': [
      { id: 'ouagadougou-bf', nom: 'Ouagadougou' },
      { id: 'bobo-dioulasso-bf', nom: 'Bobo-Dioulasso' },
      { id: 'koudougou-bf', nom: 'Koudougou' },
      { id: 'banfora-bf', nom: 'Banfora' },
      { id: 'ouahigouya-bf', nom: 'Ouahigouya' },
      { id: 'kaya-bf', nom: 'Kaya' },
      { id: 'tenkodogo-bf', nom: 'Tenkodogo' },
      { id: 'fada-ngourma-bf', nom: 'Fada N’Gourma' },
      { id: 'dedougou-bf', nom: 'Dédougou' },
      { id: 'po-bf', nom: 'Pô' }
    ],
    'GA': [
      { id: 'libreville-ga', nom: 'Libreville' },
      { id: 'port-gentil-ga', nom: 'Port-Gentil' },
      { id: 'franceville-ga', nom: 'Franceville' },
      { id: 'oyem-ga', nom: 'Oyem' },
      { id: 'lambarene-ga', nom: 'Lambaréné' },
      { id: 'moanda-ga', nom: 'Moanda' },
      { id: 'mouila-ga', nom: 'Mouila' },
      { id: 'tchibanga-ga', nom: 'Tchibanga' },
      { id: 'koulamoutou-ga', nom: 'Koulamoutou' },
      { id: 'makokou-ga', nom: 'Makokou' }
    ],
    'CI': [
      { id: 'abidjan-ci', nom: 'Abidjan' },
      { id: 'yamoussoukro-ci', nom: 'Yamoussoukro' },
      { id: 'bouake-ci', nom: 'Bouaké' },
      { id: 'daloa-ci', nom: 'Daloa' },
      { id: 'korhogo-ci', nom: 'Korhogo' },
      { id: 'san-pedro-ci', nom: 'San-Pédro' },
      { id: 'gagnoa-ci', nom: 'Gagnoa' },
      { id: 'man-ci', nom: 'Man' },
      { id: 'divo-ci', nom: 'Divo' },
      { id: 'abengourou-ci', nom: 'Abengourou' }
    ],
    'SN': [
      { id: 'dakar-sn', nom: 'Dakar' },
      { id: 'thies-sn', nom: 'Thiès' },
      { id: 'kaolack-sn', nom: 'Kaolack' },
      { id: 'ziguinchor-sn', nom: 'Ziguinchor' },
      { id: 'saint-louis-sn', nom: 'Saint-Louis' },
      { id: 'mbour-sn', nom: 'Mbour' },
      { id: 'rufisque-sn', nom: 'Rufisque' },
      { id: 'tambacounda-sn', nom: 'Tambacounda' },
      { id: 'louga-sn', nom: 'Louga' },
      { id: 'diourbel-sn', nom: 'Diourbel' }
    ],
    'ML': [
      { id: 'bamako-ml', nom: 'Bamako' },
      { id: 'sikasso-ml', nom: 'Sikasso' },
      { id: 'mopti-ml', nom: 'Mopti' },
      { id: 'segou-ml', nom: 'Ségou' },
      { id: 'kayes-ml', nom: 'Kayes' },
      { id: 'koutiala-ml', nom: 'Koutiala' },
      { id: 'gao-ml', nom: 'Gao' },
      { id: 'kati-ml', nom: 'Kati' },
      { id: 'tombouctou-ml', nom: 'Tombouctou' },
      { id: 'koulikoro-ml', nom: 'Koulikoro' }
    ],
    'TG': [
      { id: 'lome-tg', nom: 'Lomé' },
      { id: 'sokode-tg', nom: 'Sokodé' },
      { id: 'kara-tg', nom: 'Kara' },
      { id: 'kpalime-tg', nom: 'Kpalimé' },
      { id: 'atakpame-tg', nom: 'Atakpamé' },
      { id: 'bassar-tg', nom: 'Bassar' },
      { id: 'tsevie-tg', nom: 'Tsévié' },
      { id: 'aneho-tg', nom: 'Aného' },
      { id: 'mango-tg', nom: 'Mango' },
      { id: 'dapaong-tg', nom: 'Dapaong' }
    ],
    'MA': [
      { id: 'casablanca-ma', nom: 'Casablanca' },
      { id: 'rabat-ma', nom: 'Rabat' },
      { id: 'fes-ma', nom: 'Fès' },
      { id: 'marrakech-ma', nom: 'Marrakech' },
      { id: 'tanger-ma', nom: 'Tanger' },
      { id: 'meknes-ma', nom: 'Meknès' },
      { id: 'agadir-ma', nom: 'Agadir' },
      { id: 'oujda-ma', nom: 'Oujda' },
      { id: 'kenitra-ma', nom: 'Kénitra' },
      { id: 'tetouan-ma', nom: 'Tétouan' }
    ],
    'BI': [
      { id: 'bujumbura-bi', nom: 'Bujumbura' },
      { id: 'gitega-bi', nom: 'Gitega' },
      { id: 'muyinga-bi', nom: 'Muyinga' },
      { id: 'ruyigi-bi', nom: 'Ruyigi' },
      { id: 'ngozi-bi', nom: 'Ngozi' },
      { id: 'rumonge-bi', nom: 'Rumonge' },
      { id: 'bururi-bi', nom: 'Bururi' },
      { id: 'kayanza-bi', nom: 'Kayanza' },
      { id: 'rutana-bi', nom: 'Rutana' },
      { id: 'makamba-bi', nom: 'Makamba' }
    ],
    'CV': [
      { id: 'praia-cv', nom: 'Praia' },
      { id: 'mindelo-cv', nom: 'Mindelo' },
      { id: 'santa-maria-cv', nom: 'Santa Maria' },
      { id: 'assomada-cv', nom: 'Assomada' },
      { id: 'sao-filipe-cv', nom: 'São Filipe' },
      { id: 'espargos-cv', nom: 'Espargos' },
      { id: 'tarrafal-cv', nom: 'Tarrafal' },
      { id: 'porto-novo-cv', nom: 'Porto Novo' },
      { id: 'ribeira-brava-cv', nom: 'Ribeira Brava' },
      { id: 'sal-rei-cv', nom: 'Sal Rei' }
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
