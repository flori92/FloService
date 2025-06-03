import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';
import viteCompression from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Chargement explicite des variables d'environnement
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';
  
  // Log pour le debugging (uniquement en développement)
  if (!isProd) {
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
  }
  
  return {
    plugins: [
      react(),
      // Plugin PWA pour transformer l'application en Progressive Web App
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'robots.txt', 'floservice.svg', 'icons/*.png'],
        manifest: {
          name: 'FloService',
          short_name: 'FloService',
          description: 'Services professionnels en Afrique de l\'Ouest',
          theme_color: '#3b82f6',
          icons: [
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          // Ajout de sources externes autorisées pour le fetch
          navigateFallback: '/index.html',
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg,json}'],
          // Stratégies de cache améliorées
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 an
                },
                cacheableResponse: {
                  statuses: [0, 200]
                },
                fetchOptions: {
                  mode: 'cors',
                  credentials: 'omit'
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 an
                },
                cacheableResponse: {
                  statuses: [0, 200]
                },
                fetchOptions: {
                  mode: 'cors',
                  credentials: 'omit'
                }
              }
            },
            // Cache pour les images
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 30 * 24 * 60 * 60 // 30 jours
                }
              }
            },
            // Cache pour les API Supabase
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api-cache',
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 // 1 heure
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      }),
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
