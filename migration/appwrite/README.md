# Migration FloService de Supabase vers Appwrite

Ce dossier contient tous les scripts et outils nécessaires pour migrer l'application FloService de Supabase vers Appwrite.

## Structure du projet de migration

- `collections.js` : Définition des collections Appwrite à créer
- `create-collections.js` : Script pour créer les collections dans Appwrite
- `appwriteClient.js` : Client Appwrite pour remplacer le client Supabase
- `migrate-data.js` : Script pour migrer les données de Supabase vers Appwrite

## Prérequis

- Node.js v18+
- Accès à l'interface Appwrite (via GitHub)
- Clé API Appwrite avec les permissions nécessaires
- Clé API Supabase pour l'extraction des données

## Étapes de migration

### 1. Configuration de l'environnement

Installez les dépendances nécessaires :

```bash
npm install node-appwrite @supabase/supabase-js
```

### 2. Création d'une clé API Appwrite

1. Connectez-vous à l'interface Appwrite avec GitHub
2. Allez dans **Settings** > **API Keys**
3. Créez une nouvelle clé API avec les permissions suivantes :
   - `databases.read`
   - `databases.write`
   - `collections.read`
   - `collections.write`
   - `documents.read`
   - `documents.write`

### 3. Configuration du CLI Appwrite

```bash
appwrite client --endpoint https://fra.cloud.appwrite.io/v1 --project-id 683f4d0d03ef9f18e3d --key "VOTRE_CLE_API"
```

### 4. Création des collections

Modifiez le fichier `create-collections.js` pour y ajouter votre clé API, puis exécutez :

```bash
node create-collections.js
```

### 5. Migration des données

Définissez les variables d'environnement nécessaires :

```bash
export SUPABASE_KEY="votre_clé_supabase"
export APPWRITE_KEY="votre_clé_appwrite"
```

Puis exécutez le script de migration :

```bash
node migrate-data.js
```

### 6. Mise à jour du code de l'application

1. Copiez le fichier `appwriteClient.js` dans votre projet pour remplacer `supabaseClient.js`
2. Mettez à jour les composants React pour utiliser le client Appwrite
3. Testez l'application avec la nouvelle configuration

## Adaptation du code front-end

Pour adapter votre code front-end, vous devrez :

1. Remplacer les imports de Supabase par Appwrite
2. Adapter les requêtes de base de données
3. Mettre à jour la gestion de l'authentification
4. Adapter la gestion des fichiers et du stockage

## Variables d'environnement

Ajoutez ces variables à votre fichier `.env` :

```
VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=683f4d0d03ef9f18e3d
VITE_APPWRITE_DATABASE_ID=floservice_db
```

## Ressources utiles

- [Documentation Appwrite](https://appwrite.io/docs)
- [SDK Web Appwrite](https://appwrite.io/docs/client/web)
- [SDK Server Appwrite](https://appwrite.io/docs/server/nodejs)
