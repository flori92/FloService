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

// Préchargement des ressources critiques
preloadCriticalResources();

// Note: L'enregistrement du Service Worker est géré dans index.html

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