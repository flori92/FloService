import { supabase } from '../lib/supabase-secure';
import toast from 'react-hot-toast';

/**
 * Module dédié à la gestion du stockage Supabase
 * Contourne les problèmes de typage du client sécurisé pour les opérations de stockage
 */

/**
 * Télécharge un fichier vers Supabase Storage
 * @param file Fichier à télécharger (File ou string en format dataURL)
 * @param storagePath Chemin de stockage dans le bucket
 * @param bucketName Nom du bucket (par défaut: 'provider-documents')
 * @returns URL publique du fichier ou null en cas d'erreur
 */
export const uploadFile = async (
  file: File | string | null, 
  storagePath: string,
  bucketName: string = 'provider-documents'
): Promise<string | null> => {
  if (!file) {
    console.log('Aucun fichier fourni pour upload');
    return null;
  }
  
  try {
    // Cas d'un fichier en format data URL (ex: selfie biométrique)
    if (typeof file === 'string' && file.startsWith('data:')) {
      console.log(`Traitement d'un fichier en format data URL pour ${storagePath}`);
      const response = await fetch(file);
      const blob = await response.blob();
      const actualFile = new File([blob], "biometric_selfie.jpg", { type: blob.type });
      const fileName = `${Date.now()}-${actualFile.name}`;
      const fullPath = `${storagePath}/${fileName}`;
      
      console.log(`Tentative d'upload vers ${fullPath}, taille: ${actualFile.size} octets`);
      const { data, error } = await supabase.storage.from(bucketName).upload(fullPath, actualFile, {
        cacheControl: '3600',
        upsert: false
      });
      
      if (error) {
        console.error('Erreur upload data URL:', error);
        toast.error(`Erreur d'upload pour ${fileName}: ${error.message}`);
        return null;
      }
      
      const url = data?.path ? supabase.storage.from(bucketName).getPublicUrl(data.path).data.publicUrl : null;
      console.log(`Upload réussi, URL: ${url}`);
      return url;
    }
    
    // Cas d'un fichier normal (non data URL)
    const fileObj = file as File;
    const fileName = `${Date.now()}-${fileObj.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`; // Sanitize filename
    const fullPath = `${storagePath}/${fileName}`;
    
    console.log(`Tentative d'upload du fichier ${fileObj.name} vers ${fullPath}, taille: ${fileObj.size} octets, type: ${fileObj.type}`);
    
    const { data, error } = await supabase.storage.from(bucketName).upload(fullPath, fileObj, {
      cacheControl: '3600',
      upsert: false
    });
    
    if (error) {
      console.error('Erreur upload fichier normal:', error);
      toast.error(`Erreur d'upload pour ${fileObj.name}: ${error.message}`);
      return null;
    }
    
    const url = data?.path ? supabase.storage.from(bucketName).getPublicUrl(data.path).data.publicUrl : null;
    console.log(`Upload réussi, URL: ${url}`);
    return url;
  } catch (error) {
    console.error('Exception lors de l\'upload du fichier:', error);
    toast.error('Une erreur inattendue s\'est produite lors de l\'upload');
    return null;
  }
};

/**
 * Télécharge une série de fichiers séquentiellement avec un délai entre chaque upload
 * pour éviter les problèmes de concurrence avec Supabase Storage
 * @param files Liste des fichiers à télécharger
 * @param storagePath Chemin de stockage dans le bucket
 * @param delayMs Délai entre chaque upload en millisecondes (par défaut: 500ms)
 * @param bucketName Nom du bucket (par défaut: 'provider-documents')
 * @returns Liste des URLs publiques des fichiers téléchargés
 */
export const uploadFilesSequentially = async (
  files: (File | string | null)[],
  storagePath: string,
  delayMs: number = 500,
  bucketName: string = 'provider-documents'
): Promise<string[]> => {
  const urls: string[] = [];
  
  console.log(`Début de l'upload séquentiel de ${files.length} fichiers vers ${storagePath}`);
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) continue;
    
    // Ajouter un délai entre les uploads pour éviter les problèmes de concurrence
    if (i > 0) {
      console.log(`Attente de ${delayMs}ms avant l'upload du fichier ${i+1}/${files.length}`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    const url = await uploadFile(file, storagePath, bucketName);
    if (url) {
      urls.push(url);
    }
  }
  
  console.log(`Upload séquentiel terminé, ${urls.length}/${files.length} fichiers téléchargés avec succès`);
  return urls;
};

/**
 * Supprime un fichier de Supabase Storage
 * @param filePath Chemin complet du fichier dans le bucket
 * @param bucketName Nom du bucket (par défaut: 'provider-documents')
 * @returns true si la suppression a réussi, false sinon
 */
export const deleteFile = async (
  filePath: string,
  bucketName: string = 'provider-documents'
): Promise<boolean> => {
  try {
    const { error } = await supabase.storage.from(bucketName).remove([filePath]);
    
    if (error) {
      console.error('Erreur lors de la suppression du fichier:', error);
      return false;
    }
    
    console.log(`Fichier supprimé avec succès: ${filePath}`);
    return true;
  } catch (error) {
    console.error('Exception lors de la suppression du fichier:', error);
    return false;
  }
};

/**
 * Extrait le chemin du fichier à partir d'une URL publique Supabase
 * @param publicUrl URL publique du fichier
 * @param bucketName Nom du bucket (par défaut: 'provider-documents')
 * @returns Chemin du fichier dans le bucket ou null si l'URL n'est pas valide
 */
export const getFilePathFromUrl = (
  publicUrl: string,
  bucketName: string = 'provider-documents'
): string | null => {
  try {
    // Format typique: https://xxxx.supabase.co/storage/v1/object/public/provider-documents/path/to/file.jpg
    const regex = new RegExp(`public/${bucketName}/(.+)$`);
    const match = publicUrl.match(regex);
    
    if (match && match[1]) {
      return match[1];
    }
    
    console.error('Format d\'URL non reconnu:', publicUrl);
    return null;
  } catch (error) {
    console.error('Erreur lors de l\'extraction du chemin du fichier:', error);
    return null;
  }
};
