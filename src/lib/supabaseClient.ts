/**
 * Client Supabase simplifié pour compatibilité
 * Ce fichier réexporte le client principal pour maintenir la compatibilité
 */

import { supabase } from './supabase-secure';

// Réexporter le client principal
export { supabase as default };
export { supabase };

// Réexporter les types et utilitaires
export * from './supabase-secure';