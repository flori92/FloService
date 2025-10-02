# Guide de résolution : Netlify + Supabase

## 🚨 Problèmes identifiés

D'après vos captures d'écran :

### Netlify (floservice-fixed-0937u)
- ✅ Site déployé et fonctionnel
- ⚠️ Variables d'environnement à vérifier

### Supabase 
- ❌ **169 issues nécessitant attention**
- ❌ RLS (Row Level Security) non activé sur plusieurs tables
- ❌ Politiques RLS manquantes

## 📋 Solution étape par étape

### ÉTAPE 1 : Corriger Supabase (PRIORITÉ HAUTE)

#### 1.1 Activer RLS sur les tables

1. Connectez-vous à [Supabase Dashboard](https://app.supabase.com/)
2. Sélectionnez votre projet FloService
3. Allez dans **SQL Editor**
4. Créez une nouvelle requête
5. Copiez-collez le contenu du fichier `/supabase/fix-rls-issues.sql`
6. Cliquez sur **Run** pour exécuter

**Ce script va :**
- ✅ Activer RLS sur `externals`
- ✅ Activer RLS sur `provider_applications`
- ✅ Créer les politiques de sécurité appropriées
- ✅ Vérifier toutes les tables principales
- ✅ Générer un rapport de configuration

#### 1.2 Vérifier les résultats

Après exécution du script, vous devriez voir :
```
✅ RLS Configuration Summary
tables_with_rls: 15+
tables_without_rls: 3 (tables système)
```

#### 1.3 Résoudre les issues restantes

Dans le dashboard Supabase, allez dans **Performance** :
- Les avertissements concernant `spatial_ref_sys` sont normaux (table PostGIS système)
- Vérifiez que les tables métier ont toutes RLS activé

### ÉTAPE 2 : Configurer Netlify

#### 2.1 Variables d'environnement

1. Allez dans [Netlify Dashboard](https://app.netlify.com/sites/floservice-fixed-0937u/configuration/env)
2. Cliquez sur **Environment variables**
3. Ajoutez ou vérifiez ces variables :

```env
VITE_SUPABASE_URL=https://sxrofrdhpzpjqkplgoij.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cm9mcmRocHpwanFrcGxnb2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNjY2NzksImV4cCI6MjA2Mzc0MjY3OX0.ddLsIbp814amozono-gIhjNPWYE4Lgo20dJmG3Q-Cww
```

**Important** : Ces variables doivent être exactement les mêmes que dans votre code.

#### 2.2 Vérifier le build

1. Dans Netlify, allez dans **Deploys**
2. Vérifiez que le dernier build est réussi
3. Si erreur, consultez les logs de build

#### 2.3 Forcer un redéploiement

Si les variables ont été modifiées :
1. Allez dans **Deploys**
2. Cliquez sur **Trigger deploy** > **Clear cache and deploy site**

Ou via CLI :
```bash
netlify deploy --prod --build
```

### ÉTAPE 3 : Tester la connexion

#### 3.1 Test en local

```bash
# Vérifier la configuration
chmod +x scripts/check-netlify-config.sh
./scripts/check-netlify-config.sh

# Démarrer le serveur dev
npm run dev
```

Ouvrez http://localhost:5173 et :
- ✅ Vérifiez la console : "✅ Connexion à Supabase établie"
- ✅ Essayez de vous connecter
- ✅ Vérifiez qu'il n'y a pas d'erreurs 400/403

#### 3.2 Test en production

1. Allez sur https://floservice-fixed-0937u.netlify.app
2. Ouvrez la console du navigateur (F12)
3. Vérifiez :
   - ✅ Pas d'erreurs de connexion Supabase
   - ✅ Authentification fonctionne
   - ✅ Pas d'erreurs RLS (403 Forbidden)

### ÉTAPE 4 : Monitoring

#### 4.1 Dashboard Supabase

Surveillez dans Supabase :
- **Performance** : Plus d'issues critiques
- **Logs** : Vérifier les requêtes qui échouent
- **Auth** : Vérifier les connexions réussies

#### 4.2 Netlify Analytics

Surveillez dans Netlify :
- **Analytics** : Trafic et erreurs
- **Functions** : Si vous utilisez des fonctions serverless
- **Forms** : Si vous avez des formulaires

## 🔒 Politiques RLS par table

### Tables critiques avec RLS activé

| Table | Lecture | Création | Modification | Suppression |
|-------|---------|----------|--------------|-------------|
| `profiles` | Utilisateur peut voir son profil | Auto lors signup | Utilisateur peut modifier son profil | Admin seulement |
| `provider_profiles` | Public (prestataires) | Utilisateur connecté | Propriétaire + Admin | Admin seulement |
| `services` | Public | Prestataire seulement | Propriétaire + Admin | Propriétaire + Admin |
| `bookings` | Client + Prestataire concernés | Client connecté | Parties concernées | Admin seulement |
| `messages` | Participants conversation | Participant | Auteur seulement | Auteur + Admin |
| `reviews` | Public | Client après booking | Auteur seulement | Admin seulement |
| `externals` | Public | Admin seulement | Admin seulement | Admin seulement |
| `provider_applications` | Utilisateur voit ses candidatures | Utilisateur connecté | Propriétaire | Admin seulement |

## 🐛 Dépannage

### Erreur : "Row Level Security policy violation"

**Cause** : RLS activé mais politiques manquantes ou incorrectes

**Solution** :
1. Exécutez le script `fix-rls-issues.sql`
2. Vérifiez les politiques dans Supabase Dashboard > Authentication > Policies

### Erreur : "Invalid API key"

**Cause** : Variable d'environnement incorrecte

**Solution** :
1. Vérifiez `VITE_SUPABASE_ANON_KEY` dans Netlify
2. Comparez avec la clé dans Supabase > Settings > API

### Site ne se connecte pas à Supabase

**Cause** : Variables d'environnement non définies ou build cache

**Solution** :
```bash
# Dans Netlify Dashboard
1. Vérifier Environment variables
2. Clear cache and deploy
```

### Erreur 422 lors de l'inscription

**Cause** : Email déjà utilisé ou validation échouée

**Solution** : C'est maintenant géré avec des messages clairs grâce aux corrections apportées

## 📊 Checklist finale

Avant de considérer que tout fonctionne :

- [ ] Script SQL `fix-rls-issues.sql` exécuté dans Supabase
- [ ] Plus d'issues critiques dans Supabase Dashboard
- [ ] Variables d'environnement configurées dans Netlify
- [ ] Build Netlify réussi sans erreurs
- [ ] Connexion Supabase fonctionnelle en local
- [ ] Connexion Supabase fonctionnelle en production
- [ ] Authentification (login/register) fonctionne
- [ ] Pas d'erreurs RLS (403) dans la console
- [ ] Google OAuth configuré (optionnel)

## 🚀 Commandes utiles

```bash
# Vérifier la configuration locale
./scripts/check-netlify-config.sh

# Build local pour tester
npm run build
npm run preview

# Déployer manuellement sur Netlify
netlify deploy --prod

# Voir les logs en temps réel
netlify dev
```

## 📞 Support

Si vous rencontrez toujours des problèmes :

1. **Supabase Support** : https://supabase.com/dashboard/support
2. **Netlify Support** : https://answers.netlify.com/
3. **Logs Supabase** : Dashboard > Logs > Postgres Logs
4. **Logs Netlify** : Dashboard > Deploys > [Latest Deploy] > Deploy log

## 🎯 Résultat attendu

Après avoir suivi ce guide :

✅ **Supabase** : 0-5 issues (uniquement tables système)  
✅ **Netlify** : Build réussi, variables configurées  
✅ **Application** : Connexion et authentification fonctionnelles  
✅ **Sécurité** : RLS activé sur toutes les tables métier
