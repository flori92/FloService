import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type UserRole = 'client' | 'provider' | 'admin';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface UserProfile extends Omit<ProfileRow, 'is_provider' | 'is_admin'> {
  role: UserRole;
  id: string; // Ajout de la propriété id manquante
}

export class UserService {
  private static readonly PREFIX_TEST_ID = 'test-';
  private static readonly PREFIX_PROVIDER_ID = 'provider-';

  /**
   * Valide et normalise un ID utilisateur
   */
  static normalizeUserId(userId: string): string {
    if (!userId) return userId;
    
    // Supprimer les espaces et mettre en minuscules
    const cleaned = userId.trim().toLowerCase();
    
    // Si c'est un ID de test (commence par tg-)
    if (cleaned.startsWith('tg-')) {
      return `test_${cleaned.substring(3)}`;
    }
    
    // Si c'est un ID de prestataire avec préfixe
    if (cleaned.startsWith('provider-')) {
      return cleaned.replace(/-/g, '_');
    }
    
    // Si c'est un ID de prestataire sans préfixe (format: bj-1)
    if (/^[a-z]{2}-\d+$/.test(cleaned)) {
      return `provider_${cleaned.replace('-', '_')}`;
    }
    
    // Remplacer tous les tirets par des underscores pour la compatibilité
    return cleaned.replace(/-/g, '_');
  }

  /**
   * Crée un nouvel utilisateur avec un profil
   */
  static async createUserWithProfile(profile: UserProfile) {
    const userId = this.normalizeUserId(profile.id);
    
    // Vérifier si l'utilisateur existe déjà
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingUser) {
      throw new Error('Un utilisateur avec cet ID existe déjà');
    }

    // Créer le profil utilisateur
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        ...profile,
        id: userId,
        is_provider: profile.role === 'provider',
        is_admin: profile.role === 'admin'
      }]);

    if (profileError) {
      console.error('Erreur création profil:', profileError);
      throw new Error('Échec de la création du profil');
    }

    // Si c'est un prestataire, créer le profil associé
    if (profile.role === 'provider') {
      await this.createProviderProfile(userId);
    }

    return { userId };
  }

  /**
   * Crée un profil prestataire pour un utilisateur
   */
  private static async createProviderProfile(userId: string) {
    const providerId = this.generateProviderId(userId);
    
    const { error } = await supabase
      .from('provider_profiles')
      .insert([{
        id: providerId,
        user_id: userId,
        is_available: true
      }]);

    if (error) {
      console.error('Erreur création profil prestataire:', error);
      throw new Error('Échec de la création du profil prestataire');
    }
  }

  /**
   * Génère un ID de prestataire à partir d'un ID utilisateur
   */
  private static generateProviderId(userId: string): string {
    if (userId.startsWith(this.PREFIX_TEST_ID)) {
      const baseId = userId.replace(this.PREFIX_TEST_ID, '');
      return `${this.PREFIX_PROVIDER_ID}${baseId}`;
    }
    return `${this.PREFIX_PROVIDER_ID}${userId}`;
  }

  /**
   * Récupère un utilisateur avec son profil complet
   */
  static async getUserWithProfile(userId: string) {
    const normalizedId = this.normalizeUserId(userId);
    
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        provider_profiles(*)
      `)
      .eq('id', normalizedId)
      .single();

    if (error) {
      console.error('Erreur récupération utilisateur:', error);
      return null;
    }

    return data;
  }

  /**
   * Vérifie si un ID est un ID de test
   */
  static isTestId(id: string): boolean {
    return id.startsWith(this.PREFIX_TEST_ID);
  }

  /**
   * Vérifie si un ID est un ID de prestataire
   */
  static isProviderId(id: string): boolean {
    if (!id) return false;
    return (
      id.startsWith('provider_') || 
      id.startsWith('provider-') ||
      /^[a-z]{2}[-_]\d+$/.test(id)
    );
  }
}
