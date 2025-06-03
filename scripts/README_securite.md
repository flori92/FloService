# Documentation des correctifs de sécurité Supabase

## Résumé des problèmes résolus

Ce document résume les correctifs de sécurité appliqués à la base de données Supabase pour résoudre plusieurs alertes de sécurité critiques.

### 1. Activation du Row Level Security (RLS)

Nous avons activé le RLS sur plusieurs tables publiques exposées via PostgREST :
- `participant1_exists`
- `participant2_exists`
- `client_id_exists`
- `schema_migrations`

Pour chaque table, nous avons défini des politiques d'accès appropriées :
- Lecture seule pour les utilisateurs authentifiés pour les tables de vérification d'existence
- Aucun accès pour la table de migrations

### 2. Sécurisation de la table système PostGIS

Pour la table système `spatial_ref_sys` qui ne peut pas être modifiée directement (car appartenant à l'extension PostGIS) :
- Création d'un schéma dédié `postgis_secure`
- Création d'une vue standard (sans SECURITY DEFINER) dans ce schéma
- Révocation des accès directs à la table originale
- Configuration de Supabase pour exposer le schéma sécurisé

### 3. Correction des chemins de recherche mutables

Nous avons corrigé 12 fonctions PostgreSQL qui présentaient des vulnérabilités liées à des chemins de recherche mutables :
- `check_migration_status`
- `handle_non_uuid`
- `is_valid_uuid`
- `get_safe_id`
- `find_nearby_providers`
- `check_provider_availability`
- `safe_message_count`
- `get_user_conversations`
- `is_provider`
- `update_provider_availability_timestamp`
- `get_available_slots`
- `get_provider_availability_slots`

Pour chaque fonction, nous avons défini explicitement le chemin de recherche avec `SET search_path = public, pg_temp`.

## Scripts de correction

Tous les scripts SQL utilisés pour ces corrections sont disponibles dans le dossier `/scripts` :

1. `enable_rls.sql` - Active le RLS sur les tables publiques et définit des politiques d'accès
2. `fix_security_simple.sql` - Corrige les chemins de recherche mutables dans les fonctions
3. `solution_finale_postgis.sql` - Résout les alertes liées à la table système PostGIS

## Configuration Supabase

La configuration Supabase a été mise à jour dans `supabase/config.toml` pour :
- Exposer le schéma `postgis_secure` via l'API
- Ajouter ce schéma au chemin de recherche

## Recommandations supplémentaires

Pour une sécurité optimale, nous recommandons également :

1. **Paramètres d'authentification** :
   - Réduire la durée d'expiration des OTP à moins d'une heure
   - Activer la protection contre les mots de passe compromis

2. **Surveillance continue** :
   - Vérifier régulièrement le dashboard Supabase pour de nouvelles alertes de sécurité
   - Exécuter des audits de sécurité périodiques sur les nouvelles fonctions et tables

3. **Bonnes pratiques pour les développeurs** :
   - Toujours activer le RLS sur les nouvelles tables
   - Définir explicitement le chemin de recherche dans les nouvelles fonctions
   - Éviter l'utilisation de SECURITY DEFINER sauf si absolument nécessaire

## Vérification des correctifs

Pour vérifier que les correctifs ont bien été appliqués, vous pouvez exécuter les requêtes suivantes :

```sql
-- Vérifier les politiques RLS
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname IN ('public', 'postgis_secure');

-- Vérifier les chemins de recherche des fonctions
SELECT proname, prosrc, proconfig 
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE n.nspname = 'public' 
AND proname IN ('check_migration_status', 'handle_non_uuid', 'is_valid_uuid');
```

## Contact

Pour toute question concernant ces correctifs de sécurité, veuillez contacter l'équipe de développement.
