/**
 * Utilitaire pour le chargement paresseux (lazy loading) des composants
 * Créé le 03/06/2025
 */

import { lazy, ComponentType, LazyExoticComponent } from 'react';

/**
 * Charge un composant de manière paresseuse avec un délai minimal
 * pour éviter les flashs de chargement sur les connexions rapides
 * 
 * @param importFunction - Fonction d'importation dynamique du composant
 * @param minDelay - Délai minimal en ms (par défaut: 300ms)
 * @returns Composant chargé de manière paresseuse
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFunction: () => Promise<{ default: T }>,
  minDelay: number = 300
): LazyExoticComponent<T> {
  return lazy(() => {
    const start = Date.now();
    
    return importFunction().then(module => {
      const timeElapsed = Date.now() - start;
      const remainingDelay = Math.max(0, minDelay - timeElapsed);
      
      // Ajoute un délai minimal pour éviter les flashs de chargement
      if (remainingDelay > 0) {
        return new Promise(resolve => {
          setTimeout(() => resolve(module), remainingDelay);
        });
      }
      
      return module;
    });
  });
}

/**
 * Précharge un composant en arrière-plan sans bloquer le rendu
 * 
 * @param importFunction - Fonction d'importation dynamique du composant
 */
export function preloadComponent(importFunction: () => Promise<any>): void {
  // Utilise requestIdleCallback si disponible, sinon setTimeout
  const schedulePreload = window.requestIdleCallback || 
    ((cb: any) => setTimeout(cb, 1000));
  
  schedulePreload(() => {
    importFunction().catch(() => {
      // Silencieux en cas d'échec de préchargement
    });
  });
}

/**
 * Précharge plusieurs composants en arrière-plan
 * 
 * @param importFunctions - Tableau de fonctions d'importation dynamique
 */
export function preloadComponents(importFunctions: Array<() => Promise<any>>): void {
  importFunctions.forEach(preloadComponent);
}

/**
 * Précharge les ressources critiques de l'application
 */
export function preloadCriticalResources(): void {
  // Précharge les pages principales
  preloadComponents([
    () => import('../pages/Home'),
    () => import('../pages/Login'),
    () => import('../pages/Register')
  ]);
  
  // Précharge les composants fréquemment utilisés
  preloadComponents([
    () => import('../components/Header'),
    () => import('../components/Footer')
  ]);
}
