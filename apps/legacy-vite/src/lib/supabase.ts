// Ce fichier réexporte tout depuis supabase-secure.ts pour assurer une instance unique.
export * from './supabase-secure';
export { supabase as default } from './supabase-secure'; // Assure que l'export par défaut est également cohérent
