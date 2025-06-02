import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Chargement explicite des variables d'environnement
  const env = loadEnv(mode, process.cwd(), '');
  
  // Log pour le debugging
  console.log('Mode:', mode);
  console.log('Variables d\'environnement chargées:', {
    VITE_SUPABASE_URL: env.VITE_SUPABASE_URL || '(non définie)',
    VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY ? '(présente)' : '(non définie)',
  });
  
  // Vérification de l'existence du fichier .env
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.warn(`⚠️ ATTENTION: Fichier .env non trouvé à ${envPath}. Les variables d'environnement pourraient ne pas être chargées correctement.`);
  } else {
    console.log(`✅ Fichier .env trouvé à ${envPath}`);
  }
  
  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    // Définition explicite des variables d'environnement
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
    },
  };
});
