import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utilitaire pour fusionner les classes CSS avec TailwindCSS
 * Combine clsx et tailwind-merge pour une gestion optimale des classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formate une date en français
 * @param date Date à formater
 * @param options Options de formatage
 * @returns Date formatée en français
 */
export function formatDate(date: Date | string, options: Intl.DateTimeFormatOptions = {}) {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options
  };
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', defaultOptions).format(dateObj);
}

/**
 * Formate un prix en euros
 * @param price Prix à formater
 * @returns Prix formaté en euros
 */
export function formatPrice(price: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(price);
}

/**
 * Tronque un texte à une longueur maximale
 * @param text Texte à tronquer
 * @param maxLength Longueur maximale
 * @returns Texte tronqué
 */
export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Génère un slug à partir d'un texte
 * @param text Texte à transformer en slug
 * @returns Slug
 */
export function slugify(text: string) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

/**
 * Retourne une valeur par défaut si la valeur est null ou undefined
 * @param value Valeur à vérifier
 * @param defaultValue Valeur par défaut
 * @returns Valeur ou valeur par défaut
 */
export function defaultIfNullOrUndefined<T>(value: T | null | undefined, defaultValue: T): T {
  return value === null || value === undefined ? defaultValue : value;
}

/**
 * Vérifie si un objet est vide
 * @param obj Objet à vérifier
 * @returns true si l'objet est vide, false sinon
 */
export function isEmptyObject(obj: Record<string, any>) {
  return Object.keys(obj).length === 0;
}

/**
 * Génère un ID unique
 * @returns ID unique
 */
export function generateUniqueId() {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Retarde l'exécution d'une fonction
 * @param ms Délai en millisecondes
 * @returns Promise
 */
export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
