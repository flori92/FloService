import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { preloadCriticalResources } from './utils/lazyLoad';

// Chargement paresseux de l'application principale
const App = lazy(() => import('./App'));

// Composant de chargement pendant que l'application se charge
const LoadingFallback = () => (
  <div className="loading-spinner"></div>
);

// Fonction pour enregistrer le Service Worker en production
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker enregistré avec succès:', registration.scope);
        })
        .catch(error => {
          console.log('Échec de l\'enregistrement du Service Worker:', error);
        });
    });
  }
};

// Préchargement des ressources critiques
preloadCriticalResources();

// Enregistrement du Service Worker
registerServiceWorker();

// Mesure des performances de chargement initial
const reportWebVitals = () => {
  if (window.performance && 'getEntriesByType' in window.performance) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const paintMetrics = performance.getEntriesByType('paint');
        const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (paintMetrics.length > 0) {
          const fcp = paintMetrics.find(entry => entry.name === 'first-contentful-paint');
          if (fcp) {
            console.log(`FCP: ${Math.round(fcp.startTime)}ms`);
          }
        }
        
        if (navigationTiming) {
          const loadTime = navigationTiming.loadEventEnd - navigationTiming.startTime;
          console.log(`Temps de chargement total: ${Math.round(loadTime)}ms`);
        }
      }, 0);
    });
  }
};

// Activation des métriques de performance en production
if (import.meta.env.PROD) {
  reportWebVitals();
}

// Rendu de l'application
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<LoadingFallback />}>
      <App />
    </Suspense>
  </React.StrictMode>
);