# FloService - Version Appwrite

Ce document explique comment déployer et utiliser FloService avec Appwrite comme backend.

## Prérequis

- Node.js 16+ et npm
- Un compte Appwrite (gratuit sur [appwrite.io](https://appwrite.io))
- Appwrite CLI installé (`npm install -g appwrite-cli`)

## Configuration

1. **Créer un projet Appwrite**

   Si ce n'est pas déjà fait, créez un projet dans la console Appwrite.

2. **Configurer les variables d'environnement**

   Le fichier `.env.appwrite` contient toutes les variables nécessaires :
   
   ```
   VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
   VITE_APPWRITE_PROJECT_ID=votre_project_id
   VITE_APPWRITE_DATABASE_ID=floservice_db
   VITE_BACKEND_PROVIDER=appwrite
   ```

3. **Créer la base de données et les collections**

   Exécutez le script de migration pour créer les collections nécessaires :
   
   ```bash
   node migration/appwrite/create-collections.js
   ```

4. **Migrer les données (si nécessaire)**

   Si vous avez des données existantes dans Supabase, exécutez :
   
   ```bash
   node migration/appwrite/migrate-data-direct.js
   ```

## Développement local

1. **Utiliser les variables d'environnement Appwrite**

   ```bash
   cp .env.appwrite .env.local
   ```

2. **Lancer l'application en mode développement**

   ```bash
   npm run dev
   ```

## Déploiement

Pour déployer l'application complète sur Appwrite :

```bash
./deploy-appwrite.sh
```

Ce script va :
1. Construire l'application frontend
2. Installer les dépendances des fonctions
3. Déployer le tout sur Appwrite

## Structure du projet

- `src/` - Code source du frontend
- `functions/` - Fonctions cloud Appwrite
- `migration/appwrite/` - Scripts de migration vers Appwrite

## Fonctionnalités

FloService sur Appwrite offre les mêmes fonctionnalités que la version Supabase :

- Authentification des utilisateurs
- Profils utilisateurs et prestataires
- Messagerie en temps réel
- Gestion des services
- Réservations et paiements
- Stockage de fichiers

## Différences avec la version Supabase

- **Temps réel** : Appwrite a une implémentation différente du temps réel, avec quelques limitations actuelles
- **Fonctions cloud** : Les RPC Supabase sont remplacés par des fonctions Appwrite
- **Stockage** : Utilisation des buckets Appwrite au lieu du stockage Supabase

## Dépannage

### Problèmes d'authentification

Si vous rencontrez des problèmes d'authentification, vérifiez que :
- Les variables d'environnement sont correctement configurées
- Les permissions des collections sont bien définies dans Appwrite

### Problèmes de déploiement

En cas d'erreur lors du déploiement :
- Vérifiez que vous êtes bien connecté à Appwrite CLI
- Assurez-vous que le fichier `appwrite.json` est correctement configuré

## Support

Pour toute question ou problème, contactez l'équipe de développement.
