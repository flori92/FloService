import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { preloadCriticalResources } from './utils/lazyLoad';
import App from './App';

// Composant de chargement pendant que l'application se charge
const LoadingFallback = () => (
  <div className="loading-spinner"></div>
);

// Préchargement des ressources critiques
preloadCriticalResources();

// Rendu de l'application sans StrictMode pour éviter les rechargements en double
ReactDOM.createRoot(document.getElementById('root')!).render(
  <Suspense fallback={<LoadingFallback />}>
    <App />
  </Suspense>
);