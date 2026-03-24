/**
 * Composant EmptyState pour afficher un message lorsqu'aucune donnée n'est disponible
 * Permet d'améliorer l'expérience utilisateur en fournissant un feedback visuel clair
 */

import React from 'react';

/**
 * Composant d'état vide
 * @param {Object} props - Propriétés du composant
 * @param {React.ReactNode} props.icon - Icône à afficher
 * @param {string} props.title - Titre principal
 * @param {string} props.description - Description détaillée
 * @param {React.ReactNode} props.action - Bouton ou lien d'action (optionnel)
 * @param {string} props.className - Classes CSS additionnelles
 * @param {string} props.imageUrl - URL d'une image à afficher au lieu de l'icône (optionnel)
 */
const EmptyState = ({
  icon,
  title,
  description,
  action,
  className = '',
  imageUrl
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      {imageUrl ? (
        <img src={imageUrl} alt={title} className="w-32 h-32 mb-4 object-contain" />
      ) : (
        <div className="w-16 h-16 mb-4 text-gray-400 flex items-center justify-center">
          {icon}
        </div>
      )}
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      
      <p className="text-sm text-gray-500 max-w-md mb-6">{description}</p>
      
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};

/**
 * Composant d'état vide pour les messages
 */
export const EmptyMessages = ({ onAction }) => (
  <EmptyState
    icon={
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    }
    title="Aucun message"
    description="Vous n'avez pas encore de messages. Commencez une conversation avec un prestataire."
    action={
      <button 
        onClick={onAction}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Trouver un prestataire
      </button>
    }
  />
);

/**
 * Composant d'état vide pour les services
 */
export const EmptyServices = ({ onAction }) => (
  <EmptyState
    icon={
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    }
    title="Aucun service disponible"
    description="Aucun service ne correspond à votre recherche. Essayez d'autres critères ou créez votre propre service."
    action={
      <button 
        onClick={onAction}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Créer un service
      </button>
    }
  />
);

/**
 * Composant d'état vide pour les résultats de recherche
 */
export const EmptySearch = ({ searchTerm, onReset }) => (
  <EmptyState
    icon={
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    }
    title="Aucun résultat trouvé"
    description={`Nous n'avons trouvé aucun résultat pour "${searchTerm}". Vérifiez l'orthographe ou essayez d'autres termes.`}
    action={
      <button 
        onClick={onReset}
        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Réinitialiser la recherche
      </button>
    }
  />
);

/**
 * Composant d'état vide pour les erreurs de connexion
 */
export const ConnectionError = ({ onRetry }) => (
  <EmptyState
    icon={
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    }
    title="Erreur de connexion"
    description="Impossible de se connecter au serveur. Vérifiez votre connexion internet et réessayez."
    action={
      <button 
        onClick={onRetry}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        Réessayer
      </button>
    }
  />
);

export default EmptyState;
