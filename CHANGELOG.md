# Changelog FloService

## 2025-06-03
- ✨ FIX: Unification du client Supabase et correction des erreurs HTTP
  - Remplacement des importations multiples par un client unique (supabase-secure.ts)
  - Résolution des erreurs 406 (Not Acceptable) avec des en-têtes HTTP améliorés
  - Élimination des instances multiples de GoTrueClient dans le même contexte navigateur
  - Amélioration de la fonction isProvider avec gestion robuste des erreurs
  - Ajout de scripts SQL pour créer la fonction RPC is_provider manquante

## 2025-06-02
- ✨ FIX: Refonte complète du client Supabase pour compatibilité navigateur
  - Suppression de toutes les références à `require()` incompatibles avec le navigateur
  - Passage à un import ES modules au niveau supérieur pour `@supabase/supabase-js`
  - Gestion robuste des variables d'environnement avec fallback multi-sources
  - Création d'un client fallback/mock complet pour éviter les crashs
  - Gestion des ID non-UUID (format `tg-2`) via une méthode spécifique
  - Vérification de l'application des migrations via `checkMigrationsApplied`
  - Correction des erreurs 401 Unauthorized liées aux clés API manquantes

- 🐛 FIX: Correction des erreurs TypeScript dans ProviderProfile et supabaseClient
  - Correction de l'importation du composant Alert (import nommé au lieu d'import par défaut)
  - Ajout des propriétés manquantes dans l'interface EnhancedSupabaseClient (from, rpc, etc.)
  - Amélioration des déclarations de types pour éviter les erreurs TypeScript

## Versions précédentes
- Correction des migrations Supabase
- Mise à jour des données géographiques pour l'Afrique de l'Ouest et Centrale
- Implémentation des fonctions PostgreSQL pour gérer les IDs non-UUID
