import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Chargement explicite des variables d'environnement
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';
  
  // Log pour le debugging (uniquement en développement)
  if (!isProd) {
    console.log(' Mode:', mode);
    console.log('Variables d\'environnement chargées:', {
      VITE_SUPABASE_URL: env.VITE_SUPABASE_URL || '(non définie)',
      VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY ? '(présente)' : '(non définie)',
    });
    
    // Vérification de l'existence du fichier .env
    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
      console.warn(` ATTENTION: Fichier .env non trouvé à ${envPath}. Les variables d'environnement pourraient ne pas être chargées correctement.`);
    } else {
      console.log(` Fichier .env trouvé à ${envPath}`);
    }
  }
  
  return {
    plugins: [
      react(),
      // Compression des fichiers en production
      isProd && viteCompression({
        algorithm: 'brotliCompress',
        filter: /\.(js|css|html|svg)$/i,
        threshold: 10240, // 10ko
      }),
      // Visualisation des bundles en production
      isProd && visualizer({
        filename: './dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    ].filter(Boolean),
    
    // Optimisation des dépendances
    optimizeDeps: {
      exclude: ['lucide-react'],
      include: [
        'react', 
        'react-dom', 
        'react-router-dom',
        '@supabase/supabase-js'
      ],
    },
    
    // Définition explicite des variables d'environnement
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
    },
    
    // Configuration de build optimisée
    build: {
      target: 'es2015',
      cssCodeSplit: true,
      sourcemap: !isProd,
      minify: isProd ? 'terser' : false,
      terserOptions: isProd ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
        }
      } : undefined,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': [
              'react', 
              'react-dom', 
              'react-router-dom',
            ],
            'supabase': [
              '@supabase/supabase-js'
            ],
            'ui-components': [
              'framer-motion',
              'react-hook-form',
              'react-hot-toast'
            ]
          }
        }
      }
    },
    
    // Serveur de développement optimisé
    server: {
      hmr: {
        overlay: true,
      },
      watch: {
        usePolling: false,
      },
    },
  };
});
