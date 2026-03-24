/**
 * Utilitaires pour la gestion des prestataires et de leurs candidatures
 */
import { supabase } from '../lib/supabase-secure';
import toast from 'react-hot-toast';
import { ProviderApplication } from '../types/supabase';
import { uploadFile, uploadFilesSequentially } from './supabase-storage';

/**
 * Télécharge un fichier d'identité pour une candidature prestataire
 * @param file Fichier à télécharger
 * @param userId ID de l'utilisateur
 * @param fileType Type de fichier (id_front, id_back, selfie)
 * @returns URL du fichier téléchargé ou null en cas d'erreur
 */
export const uploadIdentityFile = async (
  file: File | string | null, 
  userId: string, 
  fileType: 'id_front' | 'id_back' | 'selfie'
): Promise<string | null> => {
  if (!file) {
    console.log(`Aucun fichier ${fileType} fourni pour l'utilisateur ${userId}`);
    return null;
  }
  
  try {
    console.log(`Début de l'upload du fichier ${fileType} pour l'utilisateur ${userId}`);
    const storagePath = `identity-documents/${userId}`;
    
    // Utilisation du module dédié pour l'upload
    const url = await uploadFile(file, storagePath);
    
    if (url) {
      console.log(`Upload ${fileType} réussi, URL: ${url}`);
    } else {
      console.error(`Échec de l'upload du fichier ${fileType}`);
    }
    
    return url;
  } catch (error) {
    console.error(`Exception lors de l'upload du fichier ${fileType}:`, error);
    toast.error(`Une erreur inattendue s'est produite lors de l'upload`);
    return null;
  }
};

/**
 * Télécharge plusieurs fichiers portfolio avec gestion de la concurrence
 * @param files Liste des fichiers à télécharger
 * @param userId ID de l'utilisateur
 * @returns Liste des URLs publiques des fichiers
 */
export const uploadPortfolioFiles = async (
  files: File[],
  userId: string
): Promise<string[]> => {
  if (!files || files.length === 0) {
    console.log('Aucun fichier portfolio à uploader');
    return [];
  }

  console.log(`Tentative d'upload de ${files.length} fichiers portfolio`);
  console.log('Fichiers portfolio à uploader:', files.map(f => `${f.name} (${f.size} octets)`));

  try {
    // Utilisation de la fonction uploadFilesSequentially pour gérer la concurrence
    const storagePath = `portfolios/${userId}`;
    const portfolioUrls = await uploadFilesSequentially(files, storagePath, 500);
    
    console.log(`Résultat de l'upload des portfolios: ${portfolioUrls.length}/${files.length} fichiers téléchargés`);
    if (portfolioUrls.length > 0) {
      console.log('URLs des fichiers portfolio:', portfolioUrls);
    }
    
    return portfolioUrls;
  } catch (error) {
    console.error('Exception lors de l\'upload des fichiers portfolio:', error);
    toast.error('Une erreur est survenue lors de l\'upload de votre portfolio');
    return [];
  }
};

/**
 * Crée une candidature prestataire dans Supabase
 * @param application Données de la candidature
 * @returns ID de la candidature créée ou null en cas d'erreur
 */
export const createProviderApplication = async (
  application: Partial<ProviderApplication>
): Promise<string | null> => {
  try {
    // Ajout du statut par défaut et vérification des champs obligatoires
    if (!application.user_id || !application.phone || !application.address) {
      console.error('Données de candidature incomplètes:', application);
      toast.error('Données de candidature incomplètes');
      return null;
    }

    const applicationWithStatus = {
      ...application,
      status: 'pending' as const
    };

    const { data, error } = await supabase
      .from('provider_applications')
      .insert(applicationWithStatus)
      .select('id');

    if (error) {
      console.error('Erreur lors de la création de la candidature prestataire:', error);
      toast.error('Erreur lors de la création de votre candidature');
      return null;
    }

    // Vérification que data est un tableau et contient au moins un élément
    if (!data) {
      console.error('Aucune donnée retournée après la création de la candidature');
      toast.error('Erreur lors de la création de votre candidature');
      return null;
    }
    
    // Vérification sécurisée du format de la réponse
    const dataArray = Array.isArray(data) ? data : [data];
    
    if (dataArray.length === 0) {
      console.error('Aucun enregistrement retourné après la création de la candidature');
      toast.error('Erreur lors de la création de votre candidature');
      return null;
    }
    
    // Vérification sécurisée de l'existence de l'ID
    if (dataArray.length === 0) {
      console.error('Tableau de réponse vide après la création de la candidature');
      toast.error('Erreur lors de la création de votre candidature');
      return null;
    }
    
    const firstRecord = dataArray[0];
    if (!firstRecord) {
      console.error('Premier enregistrement null après la création de la candidature');
      toast.error('Erreur lors de la création de votre candidature');
      return null;
    }
    
    // À ce stade, firstRecord est garanti de ne pas être null grâce à la vérification précédente
    const record = firstRecord as Record<string, any>; // Cast sécurisé pour éviter les erreurs de typage
    
    if (typeof record !== 'object') {
      console.error('Premier enregistrement n\'est pas un objet après la création de la candidature');
      toast.error('Erreur lors de la création de votre candidature');
      return null;
    }
    
    if (!('id' in record) || typeof record.id !== 'string') {
      console.error('ID manquant ou invalide après la création de la candidature:', record);
      toast.error('Erreur lors de la création de votre candidature');
      return null;
    }

    console.log('Candidature prestataire créée avec succès, ID:', record.id);
    return record.id;
  } catch (error) {
    console.error('Exception lors de la création de la candidature prestataire:', error);
    toast.error('Une erreur inattendue s\'est produite');
    return null;
  }
};

/**
 * Récupère l'état d'une candidature prestataire
 * @param applicationId ID de la candidature
 * @returns Données de la candidature ou null en cas d'erreur
 */
export const getProviderApplication = async (
  applicationId: string
): Promise<ProviderApplication | null> => {
  try {
    const { data, error } = await supabase
      .from('provider_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (error) {
      console.error('Erreur lors de la récupération de la candidature prestataire:', error);
      return null;
    }

    if (!data) {
      console.error('Aucune donnée retournée pour la candidature', applicationId);
      return null;
    }

    // Vérification sécurisée des données
    if (!data) {
      console.error('Données de candidature nulles');
      return null;
    }
    
    if (typeof data !== 'object') {
      console.error('Format de données de candidature invalide:', data);
      return null;
    }
    
    // Vérification de la présence des champs obligatoires
    // À ce stade, data est garanti de ne pas être null grâce à la vérification précédente
    const dataObj = data as Record<string, any>; // Cast sécurisé pour éviter les erreurs de typage
    
    if (!('id' in dataObj) || typeof dataObj.id !== 'string' || 
        !('user_id' in dataObj) || typeof dataObj.user_id !== 'string' ||
        !('status' in dataObj) || typeof dataObj.status !== 'string') {
      console.error('Données de candidature incomplètes:', dataObj);
      return null;
    }

    // Création d'un objet sécurisé avec les valeurs par défaut pour les champs obligatoires
    // Utilisation du dataObj déjà casté pour éviter les erreurs de typage
    const safeData = {
      id: dataObj.id,
      user_id: dataObj.user_id,
      status: dataObj.status as 'pending' | 'approved' | 'rejected',
      phone: '',  // Valeur par défaut
      address: '', // Valeur par défaut
      created_at: new Date().toISOString() // Valeur par défaut
    };
    
    // À ce stade, data est garanti de ne pas être null grâce à la vérification précédente
    const safeDataObj = data as Record<string, any>; // Cast sécurisé pour éviter les erreurs de typage
    
    // Ajout des champs optionnels s'ils existent et sont du bon type
    if (typeof safeDataObj.phone === 'string') safeData.phone = safeDataObj.phone;
    if (typeof safeDataObj.address === 'string') safeData.address = safeDataObj.address;
    if (typeof safeDataObj.created_at === 'string') safeData.created_at = safeDataObj.created_at;
    if (typeof safeDataObj.full_name === 'string') (safeData as any).full_name = safeDataObj.full_name;
    if (typeof safeDataObj.first_name === 'string') (safeData as any).first_name = safeDataObj.first_name;
    if (typeof safeDataObj.last_name === 'string') (safeData as any).last_name = safeDataObj.last_name;
    if (typeof safeDataObj.email === 'string') (safeData as any).email = safeDataObj.email;
    if (typeof safeDataObj.city === 'string') (safeData as any).city = safeDataObj.city;
    if (typeof safeDataObj.postal_code === 'string') (safeData as any).postal_code = safeDataObj.postal_code;
    if (typeof safeDataObj.country === 'string') (safeData as any).country = safeDataObj.country;
    if (typeof safeDataObj.bio === 'string') (safeData as any).bio = safeDataObj.bio;
    if (typeof safeDataObj.birth_date === 'string') (safeData as any).birth_date = safeDataObj.birth_date;
    if (typeof safeDataObj.date_of_birth === 'string') (safeData as any).date_of_birth = safeDataObj.date_of_birth;
    if (typeof safeDataObj.id_card_front_url === 'string') (safeData as any).id_card_front_url = safeDataObj.id_card_front_url;
    if (typeof safeDataObj.id_card_back_url === 'string') (safeData as any).id_card_back_url = safeDataObj.id_card_back_url;
    if (typeof safeDataObj.id_front_url === 'string') (safeData as any).id_front_url = safeDataObj.id_front_url;
    if (typeof safeDataObj.id_back_url === 'string') (safeData as any).id_back_url = safeDataObj.id_back_url;
    if (typeof safeDataObj.selfie_url === 'string') (safeData as any).selfie_url = safeDataObj.selfie_url;
    if (typeof safeDataObj.biometric_selfie_url === 'string') (safeData as any).biometric_selfie_url = safeDataObj.biometric_selfie_url;
    if (typeof safeDataObj.address_proof_url === 'string') (safeData as any).address_proof_url = safeDataObj.address_proof_url;
    if (typeof safeDataObj.category_id === 'string') (safeData as any).category_id = safeDataObj.category_id;
    if (Array.isArray(safeDataObj.portfolio_urls)) (safeData as any).portfolio_urls = safeDataObj.portfolio_urls;
    if (Array.isArray(safeDataObj.subcategory_ids)) (safeData as any).subcategory_ids = safeDataObj.subcategory_ids;
    if (typeof safeDataObj.specialties === 'string') (safeData as any).specialties = safeDataObj.specialties;
    if (typeof safeDataObj.experience_years === 'number') (safeData as any).experience_years = safeDataObj.experience_years;
    if (typeof safeDataObj.updated_at === 'string') (safeData as any).updated_at = safeDataObj.updated_at;

    return safeData as ProviderApplication;
  } catch (error) {
    console.error('Exception lors de la récupération de la candidature prestataire:', error);
    return null;
  }
};
