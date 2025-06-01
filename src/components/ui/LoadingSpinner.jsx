/**
 * Composant de chargement réutilisable avec différentes variantes
 * Utilisé pour indiquer visuellement qu'une opération est en cours
 */

import React from 'react';

// Types de spinners
export const SPINNER_TYPES = {
  CIRCLE: 'circle',
  DOTS: 'dots',
  PULSE: 'pulse'
};

// Tailles disponibles
export const SPINNER_SIZES = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg'
};

// Spinner circulaire avec animation de rotation
const CircleSpinner = ({ size, color }) => {
  const sizeClasses = {
    [SPINNER_SIZES.SM]: 'w-4 h-4',
    [SPINNER_SIZES.MD]: 'w-8 h-8',
    [SPINNER_SIZES.LG]: 'w-12 h-12'
  };

  return (
    <div className={`${sizeClasses[size]} border-2 rounded-full animate-spin border-t-transparent`} 
         style={{ borderColor: `${color} transparent transparent transparent` }}></div>
  );
};

// Spinner avec points qui pulsent
const DotsSpinner = ({ size, color }) => {
  const sizeClasses = {
    [SPINNER_SIZES.SM]: 'w-1 h-1 mx-0.5',
    [SPINNER_SIZES.MD]: 'w-2 h-2 mx-1',
    [SPINNER_SIZES.LG]: 'w-3 h-3 mx-1.5'
  };

  return (
    <div className="flex items-center">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${sizeClasses[size]} rounded-full animate-pulse`}
          style={{ 
            backgroundColor: color,
            animationDelay: `${i * 0.15}s`
          }}
        ></div>
      ))}
    </div>
  );
};

// Spinner avec pulsation
const PulseSpinner = ({ size, color }) => {
  const sizeClasses = {
    [SPINNER_SIZES.SM]: 'w-4 h-4',
    [SPINNER_SIZES.MD]: 'w-8 h-8',
    [SPINNER_SIZES.LG]: 'w-12 h-12'
  };

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full animate-ping opacity-75`}
      style={{ backgroundColor: color }}
    ></div>
  );
};

/**
 * Composant principal de chargement
 * @param {Object} props - Propriétés du composant
 * @param {string} [props.type='circle'] - Type de spinner (circle, dots, pulse)
 * @param {string} [props.size='md'] - Taille du spinner (sm, md, lg)
 * @param {string} [props.color='#4F46E5'] - Couleur du spinner
 * @param {string} [props.label] - Texte à afficher sous le spinner
 * @param {boolean} [props.fullScreen=false] - Si true, le spinner occupe tout l'écran
 * @param {string} [props.className] - Classes CSS additionnelles
 */
const LoadingSpinner = ({ 
  type = SPINNER_TYPES.CIRCLE,
  size = SPINNER_SIZES.MD,
  color = '#4F46E5',
  label,
  fullScreen = false,
  className = ''
}) => {
  // Sélection du spinner en fonction du type
  const renderSpinner = () => {
    switch (type) {
      case SPINNER_TYPES.DOTS:
        return <DotsSpinner size={size} color={color} />;
      case SPINNER_TYPES.PULSE:
        return <PulseSpinner size={size} color={color} />;
      case SPINNER_TYPES.CIRCLE:
      default:
        return <CircleSpinner size={size} color={color} />;
    }
  };

  // Si fullScreen, le spinner occupe tout l'écran avec un fond semi-transparent
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50">
        <div className="flex flex-col items-center">
          {renderSpinner()}
          {label && <p className="mt-4 text-white font-medium">{label}</p>}
        </div>
      </div>
    );
  }

  // Sinon, rendu standard
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {renderSpinner()}
      {label && <p className="mt-2 text-sm text-gray-600">{label}</p>}
    </div>
  );
};

export default LoadingSpinner;
