# Configuration Google OAuth pour FloService

## Prérequis

Pour activer l'authentification Google OAuth dans FloService, vous devez configurer Google Cloud Console et Supabase.

## 1. Configuration Google Cloud Console

### Créer un projet Google Cloud

1. Accédez à [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Activez l'API Google+ 

### Configurer l'écran de consentement OAuth

1. Allez dans **APIs & Services** > **OAuth consent screen**
2. Choisissez **External** comme type d'utilisateur
3. Remplissez les informations requises :
   - Nom de l'application : **FloService**
   - Email de support utilisateur
   - Logo de l'application (optionnel)
   - Domaine de l'application
   - Email du développeur

### Créer des identifiants OAuth 2.0

1. Allez dans **APIs & Services** > **Credentials**
2. Cliquez sur **Create Credentials** > **OAuth client ID**
3. Choisissez **Web application** comme type
4. Configurez les URIs autorisés :

   **Origines JavaScript autorisées** :
   ```
   http://localhost:5173
   https://floservice-fixed.netlify.app
   https://votre-domaine-production.com
   ```

   **URIs de redirection autorisées** :
   ```
   https://sxrofrdhpzpjqkplgoij.supabase.co/auth/v1/callback
   http://localhost:5173/auth/callback
   https://floservice-fixed.netlify.app/auth/callback
   ```

5. Notez votre **Client ID** et **Client Secret**

## 2. Configuration Supabase

### Activer Google Auth Provider

1. Accédez à votre [Dashboard Supabase](https://app.supabase.com/)
2. Sélectionnez votre projet FloService
3. Allez dans **Authentication** > **Providers**
4. Trouvez **Google** dans la liste et cliquez sur **Enable**
5. Entrez votre **Client ID** et **Client Secret** de Google
6. Configurez l'URL de redirection :
   ```
   https://sxrofrdhpzpjqkplgoij.supabase.co/auth/v1/callback
   ```
7. Cliquez sur **Save**

### Configurer les URLs du site

1. Dans **Authentication** > **URL Configuration**
2. Ajoutez vos URLs autorisées :
   ```
   http://localhost:5173
   https://floservice-fixed.netlify.app
   https://votre-domaine-production.com
   ```

## 3. Variables d'environnement

Assurez-vous que votre fichier `.env` contient :

```env
VITE_SUPABASE_URL=https://sxrofrdhpzpjqkplgoij.supabase.co
VITE_SUPABASE_ANON_KEY=votre_clé_anonyme_supabase
```

## 4. Configuration Netlify (Production)

### Variables d'environnement Netlify

1. Allez dans **Site settings** > **Build & deploy** > **Environment**
2. Ajoutez les variables :
   ```
   VITE_SUPABASE_URL=https://sxrofrdhpzpjqkplgoij.supabase.co
   VITE_SUPABASE_ANON_KEY=votre_clé_anonyme_supabase
   ```

### Redirections Netlify

Le fichier `netlify.toml` est déjà configuré pour gérer les redirections SPA.

## 5. Test de l'authentification

### En local

1. Démarrez le serveur de développement :
   ```bash
   npm run dev
   ```

2. Accédez à `http://localhost:5173/login`
3. Cliquez sur le bouton **Google**
4. Connectez-vous avec votre compte Google
5. Vous devriez être redirigé vers `/auth/callback` puis vers `/`

### En production

1. Déployez sur Netlify :
   ```bash
   npm run build
   # Netlify déploie automatiquement depuis GitHub
   ```

2. Accédez à votre URL de production
3. Testez l'authentification Google

## 6. Dépannage

### Erreur "redirect_uri_mismatch"

- Vérifiez que les URIs de redirection dans Google Cloud Console correspondent exactement à celles configurées
- Assurez-vous qu'il n'y a pas de slash final (`/`) en trop

### Erreur "Invalid OAuth client"

- Vérifiez que le Client ID et Client Secret sont corrects dans Supabase
- Assurez-vous que l'API Google+ est activée

### L'utilisateur est connecté mais pas de profil

- Vérifiez que la page `AuthCallback.tsx` crée bien un profil dans la table `profiles`
- Consultez les logs de la console du navigateur pour les erreurs

### Problèmes RLS (Row Level Security)

Si vous obtenez des erreurs 400 ou 403 :

1. Vérifiez les politiques RLS dans Supabase pour la table `profiles`
2. Assurez-vous que la politique permet l'insertion pour les nouveaux utilisateurs :

```sql
-- Politique pour permettre l'insertion de profil lors de l'inscription
CREATE POLICY "Utilisateurs peuvent créer leur propre profil"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Politique pour lire son propre profil
CREATE POLICY "Utilisateurs peuvent lire leur propre profil"
ON profiles FOR SELECT
USING (auth.uid() = id);
```

## 7. Sécurité

### Bonnes pratiques

- ✅ Ne jamais exposer le Client Secret dans le code frontend
- ✅ Utiliser HTTPS en production
- ✅ Limiter les domaines autorisés dans Google Cloud Console
- ✅ Activer la confirmation d'email dans Supabase (optionnel)
- ✅ Configurer les politiques RLS appropriées

### Surveillance

- Consultez régulièrement les logs d'authentification dans Supabase
- Surveillez les tentatives de connexion suspectes
- Activez les alertes pour les actions inhabituelles

## 8. Ressources

- [Documentation Supabase Auth](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Politiques RLS Supabase](https://supabase.com/docs/guides/auth/row-level-security)
