/**
 * Types pour les réponses et entités Supabase
 * Ce fichier centralise les définitions de types pour l'interaction avec Supabase
 */

// Types de base pour les tables principales
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Subcategory {
  id: string;
  name: string;
  category_id: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryWithSubcategories extends Category {
  subcategories: Subcategory[];
}

/**
 * Interface pour les candidatures prestataire
 * Supporte deux formats différents selon la version du formulaire
 */
export interface ProviderApplication {
  id: string;
  user_id: string;
  // Format v1 (formulaire actuel)
  full_name?: string;
  date_of_birth?: string;
  email?: string;
  specialties?: string;
  experience_years?: number;
  address_proof_url?: string;
  biometric_selfie_url?: string;
  
  // Format v2 (nouveau formulaire)
  first_name?: string;
  last_name?: string;
  birth_date?: string;
  
  // Champs communs aux deux formats
  phone: string;
  address: string;
  city?: string;
  postal_code?: string;
  country?: string;
  bio?: string;
  id_front_url?: string;
  id_back_url?: string;
  id_card_front_url?: string;
  id_card_back_url?: string;
  selfie_url?: string;
  portfolio_urls?: string[];
  category_id?: string;
  subcategory_ids?: string[];
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string;
}

export interface Provider {
  id: string;
  user_id: string;
  application_id: string;
  first_name: string;
  last_name: string;
  bio?: string;
  portfolio_urls?: string[];
  rating?: number;
  created_at: string;
  updated_at?: string;
}

// Types pour les réponses Supabase
export interface SupabaseResponse<T> {
  data: T | null;
  error: SupabaseError | null;
}

export interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

// Types pour les requêtes
export interface CategoryListResponse extends SupabaseResponse<Category[]> {}
export interface SubcategoryListResponse extends SupabaseResponse<Subcategory[]> {}
export interface ProviderApplicationResponse extends SupabaseResponse<ProviderApplication> {}

// Utilitaires de validation
export const isValidCategory = (data: any): data is Category => {
  return data && typeof data.id === 'string' && typeof data.name === 'string';
};

export const isValidSubcategory = (data: any): data is Subcategory => {
  return data && typeof data.id === 'string' && typeof data.name === 'string' && typeof data.category_id === 'string';
};

export const isValidCategoryArray = (data: any): data is Category[] => {
  return Array.isArray(data) && data.every(isValidCategory);
};

export const isValidSubcategoryArray = (data: any): data is Subcategory[] => {
  return Array.isArray(data) && data.every(isValidSubcategory);
};
