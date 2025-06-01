# Guide de Sécurité pour FloService

## Introduction

Ce document présente les mesures de sécurité implémentées dans FloService et les bonnes pratiques à suivre pour maintenir un niveau de sécurité optimal. Les correctifs et recommandations ont été appliqués suite à une analyse approfondie de la base de données Supabase et de la configuration du projet. La dernière mise à jour inclut l'adaptation des politiques RLS à la structure réelle de la base de données.

## Problèmes Identifiés et Solutions

### 1. Sécurité des Variables d'Environnement

**Problèmes identifiés :**
- Mots de passe et clés API exposés en clair dans les fichiers de configuration
- Absence de séparation entre les environnements de développement et de production
- Clés privées potentiellement accessibles côté client

**Solutions implémentées :**
- Création d'un fichier `.env.secure` comme modèle sécurisé
- Suppression des informations d'identification sensibles du fichier `.env.example`
- Ajout de commentaires explicatifs sur l'utilisation appropriée des variables
- Séparation claire des variables client (VITE_*) et serveur

### 2. Row Level Security (RLS)

**Problèmes identifiés :**
- Plusieurs tables sans RLS activé
- Politiques RLS mal configurées ou incomplètes
- Vues avec SECURITY DEFINER exposant des données sensibles

**Solutions implémentées :**
- Activation systématique du RLS sur toutes les tables
- Remplacement des vues SECURITY DEFINER par SECURITY INVOKER
- Création de politiques RLS spécifiques pour chaque table et opération
- Mise en place de vérifications d'autorisation pour les opérations sensibles
- Adaptation des politiques RLS à la structure réelle des tables (notamment `conversations` avec `participant1_id` et `participant2_id`)
- Gestion des vues comme `provider_profiles` dans les politiques de sécurité

### 3. Structure de la Base de Données

**Problèmes identifiés :**
- Clés étrangères non indexées impactant les performances
- Absence de contraintes de validation sur les données critiques
- Problèmes d'initialisation des politiques RLS
- Différences entre la structure attendue et la structure réelle des tables
- Utilisation de vues au lieu de tables dans certains cas (ex: `provider_profiles`)

**Solutions implémentées :**
- Création automatique d'index pour toutes les clés étrangères
- Ajout de contraintes de validation (format email, prix positifs, dates cohérentes)
- Correction des fonctions d'initialisation RLS
- Vérification de la structure réelle des tables avant application des politiques
- Adaptation des politiques RLS aux colonnes existantes (`participant1_id`/`participant2_id` au lieu de `client_id`/`provider_id`)

### 4. Audit et Traçabilité

**Problèmes identifiés :**
- Absence de journalisation des opérations sensibles
- Difficulté à identifier l'origine des modifications

**Solutions implémentées :**
- Création d'une table `audit_logs` pour tracer les opérations importantes
- Fonction `log_audit_action` pour faciliter la journalisation
- Capture des informations contextuelles (IP, user-agent)

### 5. Protection des Données Sensibles

**Problèmes identifiés :**
- Données personnelles exposées sans contrôle d'accès adéquat
- Absence de masquage pour les informations sensibles

**Solutions implémentées :**
- Fonction `mask_sensitive_data` pour masquer les données sensibles (téléphone, etc.)
- Trigger appliqué sur les tables contenant des données personnelles
- Contrôle d'accès basé sur le rôle de l'utilisateur

## Bonnes Pratiques à Suivre

### Configuration et Déploiement

1. **Gestion des Secrets**
   - Ne jamais commiter les fichiers `.env` contenant des secrets
   - Utiliser des services de gestion de secrets pour la production
   - Changer régulièrement les mots de passe et clés API

2. **Variables d'Environnement**
   - Préfixer par `VITE_` ou `EXPO_PUBLIC_` uniquement les variables accessibles côté client
   - Ne jamais exposer les clés privées ou mots de passe dans le code client
   - Utiliser des variables différentes pour chaque environnement (dev, staging, prod)

3. **Déploiement**
   - Vérifier les politiques RLS avant chaque déploiement
   - Exécuter le script `security_fixes.sql` après chaque migration
   - Tester les accès non autorisés régulièrement

### Développement

1. **Requêtes Supabase**
   - Utiliser le client sécurisé `supabase-secure.ts` pour toutes les requêtes
   - Échapper les entrées utilisateur avec `safeSearchTerm` pour les recherches
   - Vérifier les autorisations avant d'effectuer des opérations sensibles

2. **Gestion des Données**
   - Ne jamais stocker de données sensibles en clair
   - Utiliser `logAuditAction` pour tracer les modifications importantes
   - Implémenter le principe du moindre privilège dans les fonctions RPC

3. **Authentification et Autorisations**
   - Vérifier systématiquement l'identité de l'utilisateur avec `auth.uid()`
   - Utiliser `isProvider` pour valider le statut prestataire
   - Implémenter des vérifications d'autorisation explicites pour chaque opération

## Scripts de Sécurité

### Scripts de Correction de Sécurité

Plusieurs scripts ont été créés pour sécuriser la base de données :

1. **`security_fixes.sql`** - Script SQL initial contenant les corrections de sécurité
2. **`apply_security_complete.js`** - Script Node.js qui vérifie la structure réelle des tables avant d'appliquer les politiques RLS
3. **`security_fixes_reference.sql`** - Script SQL de référence généré automatiquement et adapté à la structure actuelle

Le script `apply_security_complete.js` est recommandé car il s'adapte automatiquement à la structure réelle de la base de données. Il doit être exécuté après chaque migration majeure ou modification de la structure.

### Client Supabase Sécurisé

Le fichier `supabase-secure.ts` fournit une version améliorée du client Supabase avec des fonctionnalités de sécurité supplémentaires :
- Vérification des variables d'environnement
- Timeout configurable pour les requêtes
- Fonctions utilitaires pour la sécurité
- Gestion des erreurs améliorée

## Audit de Sécurité Régulier

Il est recommandé d'effectuer un audit de sécurité régulier en utilisant les outils suivants :

1. **Supabase Security Advisor**
   - Vérifier régulièrement les erreurs et avertissements
   - Corriger immédiatement les problèmes critiques signalés

2. **Supabase Performance Advisor**
   - Surveiller les problèmes de performance qui peuvent indiquer des failles de sécurité
   - Optimiser les requêtes et index pour éviter les attaques par déni de service

3. **Tests de Pénétration**
   - Effectuer des tests d'intrusion réguliers
   - Vérifier la résistance aux attaques courantes (injection SQL, XSS, CSRF)

## Conclusion

La sécurité est un processus continu qui nécessite une vigilance constante. Les mesures implémentées fournissent une base solide, mais doivent être maintenues et améliorées au fil du temps. Assurez-vous de suivre les bonnes pratiques décrites dans ce document et de rester informé des nouvelles vulnérabilités et techniques de sécurité.

---

Document créé le 1er juin 2025 | Dernière mise à jour : 1er juin 2025 | Version : 1.1
