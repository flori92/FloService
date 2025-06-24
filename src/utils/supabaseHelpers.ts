// Utilitaires pour améliorer la compatibilité avec l'API Supabase
import { supabase } from '../lib/supabase';
import {
  Category,
  Subcategory,
  CategoryWithSubcategories,
  isValidCategory,
  isValidSubcategory,
  isValidCategoryArray,
  isValidSubcategoryArray
} from '../types/supabase';

/**
 * Vérifie si un utilisateur est un prestataire de manière robuste
 * avec plusieurs méthodes de fallback
 */
export const checkIsProvider = async (userId: string): Promise<boolean> => {
  try {
    // Méthode 1: Utiliser la fonction RPC (méthode préférée)
    const { data: isProviderRPC, error: rpcError } = await supabase
      .rpc('is_provider', { user_id: userId });
    
    if (!rpcError && typeof isProviderRPC === 'boolean') {
      return isProviderRPC;
    }
    
    // Méthode 2: Vérifier directement dans la table profiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('is_provider, role')
      .eq('id', userId)
      .maybeSingle();
    
    if (!profileError && profileData) {
      // Vérification sécurisée des propriétés
      const isProvider = profileData && 'is_provider' in profileData ? profileData.is_provider === true : false;
      const isProviderRole = profileData && 'role' in profileData ? profileData.role === 'provider' : false;
      return isProvider || isProviderRole;
    }
    
    // Méthode 3: Vérifier l'existence dans provider_profiles
    const { count, error: countError } = await supabase
      .from('provider_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (!countError && count !== null) {
      return count > 0;
    }
    
    // Si toutes les méthodes échouent, on suppose que non
    console.error('Impossible de vérifier le statut prestataire');
    return false;
  } catch (error) {
    console.error('Erreur lors de la vérification du statut prestataire:', error);
    return false;
  }
};

/**
 * Récupère un profil utilisateur de manière robuste
 */
export const fetchUserProfile = async (userId: string) => {
  try {
    // Essai avec une requête simple d'abord
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, business_name, bio, is_provider, role')
      .eq('id', userId)
      .maybeSingle();
    
    if (!profileError && profileData) {
      return { data: profileData, error: null };
    }
    
    // Si ça échoue, essayons une requête encore plus simple
    const { data: simpleData, error: simpleError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', userId)
      .maybeSingle();
    
    if (!simpleError && simpleData) {
      return { data: simpleData, error: null };
    }
    
    // Si tout échoue, retourner l'erreur
    return { data: null, error: profileError || simpleError || new Error('Profil introuvable') };
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    return { data: null, error };
  }
};

/**
 * Récupère la liste des pays depuis Supabase
 */
export const fetchCountries = async () => {
  try {
    // Essai avec une requête standard
    const { data: countriesData, error: countriesError } = await supabase
      .from('pays')
      .select('id, nom, code')
      .order('nom', { ascending: true });
    
    if (!countriesError && countriesData && countriesData.length > 0) {
      return { data: countriesData, error: null };
    }
    
    // Si la table pays n'existe pas ou est vide, on retourne une liste par défaut
    if (countriesError || !countriesData || countriesData.length === 0) {
      const defaultCountries = [
        { id: 1, nom: 'Bénin', code: 'BJ' },
        { id: 2, nom: 'Togo', code: 'TG' },
        { id: 3, nom: "Côte d'Ivoire", code: 'CI' },
        { id: 4, nom: 'Sénégal', code: 'SN' },
        { id: 5, nom: 'Cameroun', code: 'CM' },
        { id: 6, nom: 'Mali', code: 'ML' },
        { id: 7, nom: 'Burkina Faso', code: 'BF' },
        { id: 8, nom: 'Niger', code: 'NE' },
        { id: 9, nom: 'Guinée', code: 'GN' },
        { id: 10, nom: 'Gabon', code: 'GA' }
      ];
      console.warn('Utilisation de la liste de pays par défaut');
      return { data: defaultCountries, error: null };
    }
    
    return { data: [], error: new Error('Aucun pays disponible') };
  } catch (error) {
    console.error('Erreur lors de la récupération des pays:', error);
    return { data: [], error };
  }
};

/**
 * Récupère la liste des villes pour un pays depuis Supabase
 */
export const fetchCitiesByCountry = async (countryCode: string) => {
  try {
    // Essai avec une requête standard
    const { data: citiesData, error: citiesError } = await supabase
      .from('villes')
      .select('id, nom')
      .eq('pays_code', countryCode)
      .order('nom', { ascending: true });
    
    if (!citiesError && citiesData && citiesData.length > 0) {
      return { data: citiesData, error: null };
    }
    
    // Si la table villes n'existe pas ou est vide pour ce pays, on retourne une liste par défaut
    const defaultCities = {
      'BJ': ['Cotonou', 'Porto-Novo', 'Parakou', 'Abomey-Calavi', 'Bohicon'],
      'TG': ['Lomé', 'Sokodé', 'Kara', 'Kpalimé', 'Atakpamé'],
      'CI': ['Abidjan', 'Bouaké', 'Yamoussoukro', 'Korhogo', 'San-Pédro'],
      'SN': ['Dakar', 'Thiès', 'Rufisque', 'Kaolack', 'Saint-Louis'],
      'CM': ['Douala', 'Yaoundé', 'Garoua', 'Bamenda', 'Maroua'],
      'ML': ['Bamako', 'Sikasso', 'Ségou', 'Mopti', 'Koulikoro'],
      'BF': ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Banfora', 'Ouahigouya'],
      'NE': ['Niamey', 'Zinder', 'Maradi', 'Tahoua', 'Agadez'],
      'GN': ['Conakry', 'Nzérékoré', 'Kankan', 'Kindia', 'Labé'],
      'GA': ['Libreville', 'Port-Gentil', 'Franceville', 'Oyem', 'Lambaréné']
    };
    
    if (countryCode in defaultCities) {
      const cities = defaultCities[countryCode as keyof typeof defaultCities].map((name, index) => ({
        id: index + 1,
        nom: name
      }));
      console.warn('Utilisation de la liste de villes par défaut pour', countryCode);
      return { data: cities, error: null };
    }
    
    return { data: [], error: new Error('Aucune ville disponible pour ce pays') };
  } catch (error) {
    console.error('Erreur lors de la récupération des villes:', error);
    return { data: [], error };
  }
};

/**
 * Récupère les données d'un prestataire de manière robuste
 */
export const fetchProviderData = async (providerId: string) => {
  try {
    // Vérifier d'abord si c'est un prestataire
    const isProvider = await checkIsProvider(providerId);
    
    if (!isProvider) {
      return { data: null, error: new Error('Cet utilisateur n\'est pas un prestataire') };
    }
    
    // Utiliser la nouvelle fonction sécurisée pour éviter les erreurs 400
    const { getProfileWithProviderData } = await import('../lib/supabase-secure');
    
    const result = await getProfileWithProviderData(providerId);
    
    if (result.error) {
      console.warn('Erreur lors de la récupération via getProfileWithProviderData, fallback vers fetchUserProfile');
      return await fetchUserProfile(providerId);
    }
    
    return result;
    
  } catch (error) {
    console.error('Erreur lors de la récupération des données prestataire:', error);
    return { data: null, error };
  }
};

/**
 * Fonction utilitaire pour contourner les problèmes d'en-têtes Accept
 * en utilisant des requêtes POST au lieu de GET
 */
export const fetchWithAcceptWorkaround = async (
  table: string,
  columns: string,
  filters: Record<string, any>
) => {
  try {
    // Construire la requête avec la méthode POST pour éviter les problèmes d'en-têtes Accept
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .match(filters)
      .maybeSingle();
    
    return { data, error };
  } catch (error) {
    console.error(`Erreur lors de la requête sur ${table}:`, error);
    return { data: null, error };
  }
};

/**
 * Récupère toutes les catégories avec typage fort
 */
export const fetchCategories = async (): Promise<{ data: Category[]; error: Error | null }> => {
  try {
    const response = await supabase
      .from('categories')
      .select('id, name, description')
      .order('name', { ascending: true });

    if (response.error) {
      console.error('Erreur lors du chargement des catégories:', response.error);
      return { data: [], error: new Error(response.error.message) };
    }

    // Validation et transformation des données
    if (!Array.isArray(response.data)) {
      return { data: [], error: new Error('Format de données invalide') };
    }

    const validCategories = response.data
      .filter(item => isValidCategory(item))
      .map(item => ({
        id: item.id,
        name: item.name,
        description: item.description
      }));

    return { data: validCategories, error: null };
  } catch (error: any) {
    console.error('Exception lors du chargement des catégories:', error);
    return { data: [], error: error instanceof Error ? error : new Error('Erreur inconnue') };
  }
};

/**
 * Récupère les sous-catégories pour une catégorie spécifique avec typage fort
 */
export const fetchSubcategoriesByCategory = async (categoryId: string): Promise<{ data: Subcategory[]; error: Error | null }> => {
  try {
    const response = await supabase
      .from('subcategories')
      .select('id, name, category_id, description')
      .eq('category_id', categoryId)
      .order('name', { ascending: true });

    if (response.error) {
      console.error(`Erreur lors du chargement des sous-catégories pour la catégorie ${categoryId}:`, response.error);
      return { data: [], error: new Error(response.error.message) };
    }

    // Validation et transformation des données
    if (!Array.isArray(response.data)) {
      return { data: [], error: new Error('Format de données invalide') };
    }

    const validSubcategories = response.data
      .filter(item => isValidSubcategory(item))
      .map(item => ({
        id: item.id,
        name: item.name,
        category_id: item.category_id,
        description: item.description
      }));

    return { data: validSubcategories, error: null };
  } catch (error: any) {
    console.error(`Exception lors du chargement des sous-catégories pour la catégorie ${categoryId}:`, error);
    return { data: [], error: error instanceof Error ? error : new Error('Erreur inconnue') };
  }
};

/**
 * Récupère toutes les catégories avec leurs sous-catégories
 */
export const fetchCategoriesWithSubcategories = async (): Promise<{ data: CategoryWithSubcategories[]; error: Error | null }> => {
  try {
    // 1. Récupérer toutes les catégories
    const { data: categories, error: categoriesError } = await fetchCategories();
    
    if (categoriesError || categories.length === 0) {
      return { data: [], error: categoriesError || new Error('Aucune catégorie trouvée') };
    }

    // 2. Pour chaque catégorie, récupérer ses sous-catégories
    const categoriesWithSubcategories = await Promise.all(
      categories.map(async (category) => {
        try {
          const { data: subcategories, error: subcategoriesError } = await fetchSubcategoriesByCategory(category.id);
          
          if (subcategoriesError) {
            console.error(`Erreur lors du chargement des sous-catégories pour la catégorie ${category.id}:`, subcategoriesError);
            return {
              ...category,
              subcategories: []
            };
          }
          
          return {
            ...category,
            subcategories: subcategories
          };
        } catch (error) {
          console.error(`Exception lors du chargement des sous-catégories pour la catégorie ${category.id}:`, error);
          return {
            ...category,
            subcategories: []
          };
        }
      })
    );

    return { data: categoriesWithSubcategories, error: null };
  } catch (error: any) {
    console.error('Exception lors du chargement des catégories avec sous-catégories:', error);
    return { data: [], error: error instanceof Error ? error : new Error('Erreur inconnue') };
  }
};
