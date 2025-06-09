// vite.config.ts
import { defineConfig, loadEnv } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
import fs from "fs";
import path from "path";
import { visualizer } from "file:///home/project/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import { VitePWA } from "file:///home/project/node_modules/vite-plugin-pwa/dist/index.js";
import viteCompression from "file:///home/project/node_modules/vite-plugin-compression/dist/index.mjs";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isProd = mode === "production";
  if (!isProd) {
    console.log("Mode:", mode);
    console.log("Variables d'environnement charg\xE9es:", {
      VITE_SUPABASE_URL: env.VITE_SUPABASE_URL || "(non d\xE9finie)",
      VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY ? "(pr\xE9sente)" : "(non d\xE9finie)"
    });
    const envPath = path.resolve(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) {
      console.warn(`\u26A0\uFE0F ATTENTION: Fichier .env non trouv\xE9 \xE0 ${envPath}. Les variables d'environnement pourraient ne pas \xEAtre charg\xE9es correctement.`);
    } else {
      console.log(`\u2705 Fichier .env trouv\xE9 \xE0 ${envPath}`);
    }
  }
  return {
    plugins: [
      react(),
      // Plugin PWA pour transformer l'application en Progressive Web App
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "robots.txt", "floservice.svg", "icons/*.png"],
        manifest: {
          name: "FloService",
          short_name: "FloService",
          description: "Services professionnels en Afrique de l'Ouest",
          theme_color: "#3b82f6",
          icons: [
            {
              src: "/icons/icon-192x192.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "/icons/icon-512x512.png",
              sizes: "512x512",
              type: "image/png"
            },
            {
              src: "/icons/icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            }
          ]
        },
        workbox: {
          // Ajout de sources externes autorisées pour le fetch
          navigateFallback: "/index.html",
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg,json}"],
          // Exclusion des polices Google pour éviter les problèmes de CSP
          navigateFallbackDenylist: [/^\/api\//],
          skipWaiting: true,
          clientsClaim: true,
          // Désactivation du précaching des polices Google
          // pour éviter les problèmes de CSP
          runtimeCaching: [
            // Cache pour les images
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
              handler: "CacheFirst",
              options: {
                cacheName: "images-cache",
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 30 * 24 * 60 * 60
                  // 30 jours
                }
              }
            },
            // Cache pour les API Supabase
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "supabase-api-cache",
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60
                  // 1 heure
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
        algorithm: "brotliCompress",
        filter: /\.(js|css|html|svg)$/i,
        threshold: 10240
        // 10ko
      }),
      // Visualisation des bundles en production
      isProd && visualizer({
        filename: "./dist/stats.html",
        open: false,
        gzipSize: true,
        brotliSize: true
      })
    ].filter(Boolean),
    // Optimisation des dépendances
    optimizeDeps: {
      exclude: ["lucide-react"],
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@supabase/supabase-js"
      ]
    },
    // Définition explicite des variables d'environnement
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(env.VITE_SUPABASE_URL),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(env.VITE_SUPABASE_ANON_KEY)
    },
    // Configuration de build optimisée
    build: {
      target: "es2015",
      cssCodeSplit: true,
      sourcemap: !isProd,
      minify: isProd ? "terser" : false,
      terserOptions: isProd ? {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      } : void 0,
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor": [
              "react",
              "react-dom",
              "react-router-dom"
            ],
            "supabase": [
              "@supabase/supabase-js"
            ],
            "ui-components": [
              "framer-motion",
              "react-hook-form",
              "react-hot-toast"
            ]
          }
        }
      }
    },
    // Serveur de développement optimisé
    server: {
      hmr: {
        overlay: true
      },
      watch: {
        usePolling: false
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyB2aXN1YWxpemVyIH0gZnJvbSAncm9sbHVwLXBsdWdpbi12aXN1YWxpemVyJztcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnO1xuaW1wb3J0IHZpdGVDb21wcmVzc2lvbiBmcm9tICd2aXRlLXBsdWdpbi1jb21wcmVzc2lvbic7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIC8vIENoYXJnZW1lbnQgZXhwbGljaXRlIGRlcyB2YXJpYWJsZXMgZCdlbnZpcm9ubmVtZW50XG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgcHJvY2Vzcy5jd2QoKSwgJycpO1xuICBjb25zdCBpc1Byb2QgPSBtb2RlID09PSAncHJvZHVjdGlvbic7XG4gIFxuICAvLyBMb2cgcG91ciBsZSBkZWJ1Z2dpbmcgKHVuaXF1ZW1lbnQgZW4gZFx1MDBFOXZlbG9wcGVtZW50KVxuICBpZiAoIWlzUHJvZCkge1xuICAgIGNvbnNvbGUubG9nKCdNb2RlOicsIG1vZGUpO1xuICAgIGNvbnNvbGUubG9nKCdWYXJpYWJsZXMgZFxcJ2Vudmlyb25uZW1lbnQgY2hhcmdcdTAwRTllczonLCB7XG4gICAgICBWSVRFX1NVUEFCQVNFX1VSTDogZW52LlZJVEVfU1VQQUJBU0VfVVJMIHx8ICcobm9uIGRcdTAwRTlmaW5pZSknLFxuICAgICAgVklURV9TVVBBQkFTRV9BTk9OX0tFWTogZW52LlZJVEVfU1VQQUJBU0VfQU5PTl9LRVkgPyAnKHByXHUwMEU5c2VudGUpJyA6ICcobm9uIGRcdTAwRTlmaW5pZSknLFxuICAgIH0pO1xuICAgIFxuICAgIC8vIFZcdTAwRTlyaWZpY2F0aW9uIGRlIGwnZXhpc3RlbmNlIGR1IGZpY2hpZXIgLmVudlxuICAgIGNvbnN0IGVudlBhdGggPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJy5lbnYnKTtcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZW52UGF0aCkpIHtcbiAgICAgIGNvbnNvbGUud2FybihgXHUyNkEwXHVGRTBGIEFUVEVOVElPTjogRmljaGllciAuZW52IG5vbiB0cm91dlx1MDBFOSBcdTAwRTAgJHtlbnZQYXRofS4gTGVzIHZhcmlhYmxlcyBkJ2Vudmlyb25uZW1lbnQgcG91cnJhaWVudCBuZSBwYXMgXHUwMEVBdHJlIGNoYXJnXHUwMEU5ZXMgY29ycmVjdGVtZW50LmApO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZyhgXHUyNzA1IEZpY2hpZXIgLmVudiB0cm91dlx1MDBFOSBcdTAwRTAgJHtlbnZQYXRofWApO1xuICAgIH1cbiAgfVxuICBcbiAgcmV0dXJuIHtcbiAgICBwbHVnaW5zOiBbXG4gICAgICByZWFjdCgpLFxuICAgICAgLy8gUGx1Z2luIFBXQSBwb3VyIHRyYW5zZm9ybWVyIGwnYXBwbGljYXRpb24gZW4gUHJvZ3Jlc3NpdmUgV2ViIEFwcFxuICAgICAgVml0ZVBXQSh7XG4gICAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxuICAgICAgICBpbmNsdWRlQXNzZXRzOiBbJ2Zhdmljb24uaWNvJywgJ3JvYm90cy50eHQnLCAnZmxvc2VydmljZS5zdmcnLCAnaWNvbnMvKi5wbmcnXSxcbiAgICAgICAgbWFuaWZlc3Q6IHtcbiAgICAgICAgICBuYW1lOiAnRmxvU2VydmljZScsXG4gICAgICAgICAgc2hvcnRfbmFtZTogJ0Zsb1NlcnZpY2UnLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU2VydmljZXMgcHJvZmVzc2lvbm5lbHMgZW4gQWZyaXF1ZSBkZSBsXFwnT3Vlc3QnLFxuICAgICAgICAgIHRoZW1lX2NvbG9yOiAnIzNiODJmNicsXG4gICAgICAgICAgaWNvbnM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc3JjOiAnL2ljb25zL2ljb24tMTkyeDE5Mi5wbmcnLFxuICAgICAgICAgICAgICBzaXplczogJzE5MngxOTInLFxuICAgICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc3JjOiAnL2ljb25zL2ljb24tNTEyeDUxMi5wbmcnLFxuICAgICAgICAgICAgICBzaXplczogJzUxMng1MTInLFxuICAgICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc3JjOiAnL2ljb25zL2ljb24tNTEyeDUxMi5wbmcnLFxuICAgICAgICAgICAgICBzaXplczogJzUxMng1MTInLFxuICAgICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJyxcbiAgICAgICAgICAgICAgcHVycG9zZTogJ21hc2thYmxlJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgd29ya2JveDoge1xuICAgICAgICAgIC8vIEFqb3V0IGRlIHNvdXJjZXMgZXh0ZXJuZXMgYXV0b3Jpc1x1MDBFOWVzIHBvdXIgbGUgZmV0Y2hcbiAgICAgICAgICBuYXZpZ2F0ZUZhbGxiYWNrOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgIGdsb2JQYXR0ZXJuczogWycqKi8qLntqcyxjc3MsaHRtbCxpY28scG5nLHN2Zyx3ZWJwLGpwZyxqcGVnLGpzb259J10sXG4gICAgICAgICAgLy8gRXhjbHVzaW9uIGRlcyBwb2xpY2VzIEdvb2dsZSBwb3VyIFx1MDBFOXZpdGVyIGxlcyBwcm9ibFx1MDBFOG1lcyBkZSBDU1BcbiAgICAgICAgICBuYXZpZ2F0ZUZhbGxiYWNrRGVueWxpc3Q6IFsvXlxcL2FwaVxcLy9dLFxuICAgICAgICAgIHNraXBXYWl0aW5nOiB0cnVlLFxuICAgICAgICAgIGNsaWVudHNDbGFpbTogdHJ1ZSxcbiAgICAgICAgICAvLyBEXHUwMEU5c2FjdGl2YXRpb24gZHUgcHJcdTAwRTljYWNoaW5nIGRlcyBwb2xpY2VzIEdvb2dsZVxuICAgICAgICAgIC8vIHBvdXIgXHUwMEU5dml0ZXIgbGVzIHByb2JsXHUwMEU4bWVzIGRlIENTUFxuICAgICAgICAgIHJ1bnRpbWVDYWNoaW5nOiBbXG4gICAgICAgICAgICAvLyBDYWNoZSBwb3VyIGxlcyBpbWFnZXNcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdXJsUGF0dGVybjogL1xcLig/OnBuZ3xqcGd8anBlZ3xzdmd8d2VicCkkLyxcbiAgICAgICAgICAgICAgaGFuZGxlcjogJ0NhY2hlRmlyc3QnLFxuICAgICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgY2FjaGVOYW1lOiAnaW1hZ2VzLWNhY2hlJyxcbiAgICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiA2MCxcbiAgICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDMwICogMjQgKiA2MCAqIDYwIC8vIDMwIGpvdXJzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLy8gQ2FjaGUgcG91ciBsZXMgQVBJIFN1cGFiYXNlXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHVybFBhdHRlcm46IC9eaHR0cHM6XFwvXFwvLipcXC5zdXBhYmFzZVxcLmNvXFwvLiovaSxcbiAgICAgICAgICAgICAgaGFuZGxlcjogJ05ldHdvcmtGaXJzdCcsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBjYWNoZU5hbWU6ICdzdXBhYmFzZS1hcGktY2FjaGUnLFxuICAgICAgICAgICAgICAgIG5ldHdvcmtUaW1lb3V0U2Vjb25kczogMTAsXG4gICAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgICAgbWF4RW50cmllczogNTAsXG4gICAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwIC8vIDEgaGV1cmVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGNhY2hlYWJsZVJlc3BvbnNlOiB7XG4gICAgICAgICAgICAgICAgICBzdGF0dXNlczogWzAsIDIwMF1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgLy8gQ29tcHJlc3Npb24gZGVzIGZpY2hpZXJzIGVuIHByb2R1Y3Rpb25cbiAgICAgIGlzUHJvZCAmJiB2aXRlQ29tcHJlc3Npb24oe1xuICAgICAgICBhbGdvcml0aG06ICdicm90bGlDb21wcmVzcycsXG4gICAgICAgIGZpbHRlcjogL1xcLihqc3xjc3N8aHRtbHxzdmcpJC9pLFxuICAgICAgICB0aHJlc2hvbGQ6IDEwMjQwLCAvLyAxMGtvXG4gICAgICB9KSxcbiAgICAgIC8vIFZpc3VhbGlzYXRpb24gZGVzIGJ1bmRsZXMgZW4gcHJvZHVjdGlvblxuICAgICAgaXNQcm9kICYmIHZpc3VhbGl6ZXIoe1xuICAgICAgICBmaWxlbmFtZTogJy4vZGlzdC9zdGF0cy5odG1sJyxcbiAgICAgICAgb3BlbjogZmFsc2UsXG4gICAgICAgIGd6aXBTaXplOiB0cnVlLFxuICAgICAgICBicm90bGlTaXplOiB0cnVlLFxuICAgICAgfSksXG4gICAgXS5maWx0ZXIoQm9vbGVhbiksXG4gICAgXG4gICAgLy8gT3B0aW1pc2F0aW9uIGRlcyBkXHUwMEU5cGVuZGFuY2VzXG4gICAgb3B0aW1pemVEZXBzOiB7XG4gICAgICBleGNsdWRlOiBbJ2x1Y2lkZS1yZWFjdCddLFxuICAgICAgaW5jbHVkZTogW1xuICAgICAgICAncmVhY3QnLCBcbiAgICAgICAgJ3JlYWN0LWRvbScsIFxuICAgICAgICAncmVhY3Qtcm91dGVyLWRvbScsXG4gICAgICAgICdAc3VwYWJhc2Uvc3VwYWJhc2UtanMnXG4gICAgICBdLFxuICAgIH0sXG4gICAgXG4gICAgLy8gRFx1MDBFOWZpbml0aW9uIGV4cGxpY2l0ZSBkZXMgdmFyaWFibGVzIGQnZW52aXJvbm5lbWVudFxuICAgIGRlZmluZToge1xuICAgICAgJ2ltcG9ydC5tZXRhLmVudi5WSVRFX1NVUEFCQVNFX1VSTCc6IEpTT04uc3RyaW5naWZ5KGVudi5WSVRFX1NVUEFCQVNFX1VSTCksXG4gICAgICAnaW1wb3J0Lm1ldGEuZW52LlZJVEVfU1VQQUJBU0VfQU5PTl9LRVknOiBKU09OLnN0cmluZ2lmeShlbnYuVklURV9TVVBBQkFTRV9BTk9OX0tFWSksXG4gICAgfSxcbiAgICBcbiAgICAvLyBDb25maWd1cmF0aW9uIGRlIGJ1aWxkIG9wdGltaXNcdTAwRTllXG4gICAgYnVpbGQ6IHtcbiAgICAgIHRhcmdldDogJ2VzMjAxNScsXG4gICAgICBjc3NDb2RlU3BsaXQ6IHRydWUsXG4gICAgICBzb3VyY2VtYXA6ICFpc1Byb2QsXG4gICAgICBtaW5pZnk6IGlzUHJvZCA/ICd0ZXJzZXInIDogZmFsc2UsXG4gICAgICB0ZXJzZXJPcHRpb25zOiBpc1Byb2QgPyB7XG4gICAgICAgIGNvbXByZXNzOiB7XG4gICAgICAgICAgZHJvcF9jb25zb2xlOiB0cnVlLFxuICAgICAgICAgIGRyb3BfZGVidWdnZXI6IHRydWUsXG4gICAgICAgIH1cbiAgICAgIH0gOiB1bmRlZmluZWQsXG4gICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgIG91dHB1dDoge1xuICAgICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgICAgJ3ZlbmRvcic6IFtcbiAgICAgICAgICAgICAgJ3JlYWN0JywgXG4gICAgICAgICAgICAgICdyZWFjdC1kb20nLCBcbiAgICAgICAgICAgICAgJ3JlYWN0LXJvdXRlci1kb20nLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICdzdXBhYmFzZSc6IFtcbiAgICAgICAgICAgICAgJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcydcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAndWktY29tcG9uZW50cyc6IFtcbiAgICAgICAgICAgICAgJ2ZyYW1lci1tb3Rpb24nLFxuICAgICAgICAgICAgICAncmVhY3QtaG9vay1mb3JtJyxcbiAgICAgICAgICAgICAgJ3JlYWN0LWhvdC10b2FzdCdcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8vIFNlcnZldXIgZGUgZFx1MDBFOXZlbG9wcGVtZW50IG9wdGltaXNcdTAwRTlcbiAgICBzZXJ2ZXI6IHtcbiAgICAgIGhtcjoge1xuICAgICAgICBvdmVybGF5OiB0cnVlLFxuICAgICAgfSxcbiAgICAgIHdhdGNoOiB7XG4gICAgICAgIHVzZVBvbGxpbmc6IGZhbHNlLFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlOLFNBQVMsY0FBYyxlQUFlO0FBQy9QLE9BQU8sV0FBVztBQUNsQixPQUFPLFFBQVE7QUFDZixPQUFPLFVBQVU7QUFDakIsU0FBUyxrQkFBa0I7QUFDM0IsU0FBUyxlQUFlO0FBQ3hCLE9BQU8scUJBQXFCO0FBRzVCLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBRXhDLFFB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
