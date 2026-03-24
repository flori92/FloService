import { createClient } from '@supabase/supabase-js';

// Récupération des variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sxrofrdhpzpjqkplgoij.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cm9mcmRocHpwanFrcGxnb2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNjY2NzksImV4cCI6MjA2Mzc0MjY3OX0.ddLsIbp814amozono-gIhjNPWYE4Lgo20dJmG3Q-Cww';

// Client Supabase dédié au stockage
export const storageClient = createClient(supabaseUrl, supabaseKey);

/**
 * Télécharge un fichier vers Supabase Storage
 * @param file Fichier à télécharger (File ou string data URL)
 * @param bucket Nom du bucket de stockage
 * @param storagePath Chemin de stockage dans le bucket
 * @returns URL publique du fichier ou null en cas d'erreur
 */
export const uploadFile = async (
  file: File | string | null, 
  bucket: string = 'provider-documents',
  storagePath: string
): Promise<string | null> => {
  if (!file) {
    console.log('Aucun fichier fourni pour upload');
    return null;
  }
  
  try {
    // Cas d'une data URL (comme pour la selfie biométrique)
    if (typeof file === 'string') {
      console.log(`Traitement d'un fichier en format data URL pour ${storagePath}`);
      const response = await fetch(file);
      const blob = await response.blob();
      const actualFile = new File([blob], "biometric_selfie.jpg", { type: blob.type });
      const fileName = `${Date.now()}-${actualFile.name}`;
      const fullPath = `${storagePath}/${fileName}`;
      
      console.log(`Tentative d'upload vers ${bucket}/${fullPath}, taille: ${actualFile.size} octets`);
      const { data, error } = await storageClient.storage.from(bucket).upload(fullPath, actualFile, {
        cacheControl: '3600',
        upsert: false
      });
      
      if (error) {
        console.error('Erreur upload data URL:', error);
        return null;
      }
      
      const url = data?.path ? storageClient.storage.from(bucket).getPublicUrl(data.path).data.publicUrl : null;
      console.log(`Upload réussi, URL: ${url}`);
      return url;
    }
    
    // Cas d'un fichier normal
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`; // Sanitize filename
    const fullPath = `${storagePath}/${fileName}`;
    
    console.log(`Tentative d'upload du fichier ${file.name} vers ${bucket}/${fullPath}, taille: ${file.size} octets, type: ${file.type}`);
    
    const { data, error } = await storageClient.storage.from(bucket).upload(fullPath, file, {
      cacheControl: '3600',
      upsert: false
    });
    
    if (error) {
      console.error('Erreur upload fichier:', error);
      return null;
    }
    
    const url = data?.path ? storageClient.storage.from(bucket).getPublicUrl(data.path).data.publicUrl : null;
    console.log(`Upload réussi, URL: ${url}`);
    return url;
  } catch (e) {
    console.error('Exception lors de l\'upload:', e);
    return null;
  }
};
