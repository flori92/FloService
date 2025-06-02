# Changelog FloService

## 2025-06-02
- 🐛 FIX: Correction des erreurs TypeScript dans ProviderProfile et supabaseClient
  - Correction de l'importation du composant Alert (import nommé au lieu d'import par défaut)
  - Ajout des propriétés manquantes dans l'interface EnhancedSupabaseClient (from, rpc, etc.)
  - Amélioration des déclarations de types pour éviter les erreurs TypeScript

## Versions précédentes
- Correction des migrations Supabase
- Mise à jour des données géographiques pour l'Afrique de l'Ouest et Centrale
- Implémentation des fonctions PostgreSQL pour gérer les IDs non-UUID
