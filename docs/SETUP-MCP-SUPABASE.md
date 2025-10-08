# Configuration MCP Supabase pour FloService

## 🎯 Qu'est-ce que MCP Supabase ?

Le serveur MCP (Model Context Protocol) Supabase vous permet de gérer votre base de données Supabase **directement depuis Windsurf**, sans avoir à ouvrir le dashboard.

### Fonctionnalités activées

Avec votre configuration MCP, vous aurez accès à :

- ✅ **docs** : Documentation Supabase intégrée
- ✅ **account** : Gestion du compte et des projets
- ✅ **database** : Exécution de requêtes SQL directes
- ✅ **debugging** : Outils de débogage
- ✅ **development** : Outils de développement
- ✅ **functions** : Gestion des Edge Functions
- ✅ **branching** : Gestion des branches (preview)
- ✅ **storage** : Gestion du stockage

## 📥 Installation

### Étape 1 : Ajouter la configuration MCP

1. Ouvrez le fichier de configuration MCP :
   ```bash
   code ~/.codeium/windsurf/mcp_config.json
   ```

2. Si le fichier est vide ou n'existe pas, créez cette structure :
   ```json
   {
     "mcpServers": {}
   }
   ```

3. Ajoutez la configuration Supabase dans `mcpServers` :
   ```json
   {
     "mcpServers": {
       "supabase": {
         "command": "npx",
         "args": [
           "-y",
           "mcp-remote",
           "https://mcp.supabase.com/mcp?project_ref=sxrofrdhpzpjqkplgoij&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cstorage"
         ]
       }
     }
   }
   ```

4. **Si vous avez déjà d'autres serveurs MCP** (GitKraken, GitHub), la configuration complète sera :
   ```json
   {
     "mcpServers": {
       "gitkraken": {
         "command": "node",
         "args": ["/path/to/gitkraken/server.js"]
       },
       "github": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-github"],
         "env": {
           "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
         }
       },
       "supabase": {
         "command": "npx",
         "args": [
           "-y",
           "mcp-remote",
           "https://mcp.supabase.com/mcp?project_ref=sxrofrdhpzpjqkplgoij&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cstorage"
         ]
       }
     }
   }
   ```

### Étape 2 : Redémarrer Windsurf

1. Fermez complètement Windsurf
2. Rouvrez Windsurf
3. Le serveur MCP Supabase devrait maintenant être actif

### Étape 3 : Vérifier la connexion

Dans Windsurf, vous devriez voir le serveur Supabase disponible dans la palette de commandes MCP.

## 🚀 Utilisation

### Exécuter des requêtes SQL directement

Maintenant que MCP est configuré, vous pouvez me demander :

```
"Exécute cette requête SQL sur Supabase :
SELECT * FROM profiles WHERE is_admin = true"
```

Et j'utiliserai le serveur MCP pour exécuter directement la requête !

### Corriger les problèmes RLS

Au lieu d'aller sur le dashboard Supabase, vous pouvez maintenant me demander :

```
"Active RLS sur la table externals avec les bonnes politiques"
```

Et je le ferai directement via MCP !

### Exemples de commandes utiles

**Lister toutes les tables sans RLS** :
```
"Montre-moi toutes les tables qui n'ont pas RLS activé"
```

**Créer une politique RLS** :
```
"Crée une politique RLS pour que les utilisateurs puissent lire leur propre profil"
```

**Déboguer une requête qui échoue** :
```
"Pourquoi cette requête échoue : SELECT * FROM bookings WHERE user_id = '123'"
```

**Gérer le stockage** :
```
"Liste tous les buckets de storage et leur taille"
```

## 🔧 Résolution immédiate des 169 issues

Maintenant que MCP est configuré, au lieu d'exécuter manuellement le script SQL, **je peux le faire pour vous** :

1. **Redémarrez Windsurf** avec la nouvelle configuration MCP
2. Demandez-moi simplement :
   ```
   "Exécute le script supabase/fix-rls-issues.sql sur ma base de données"
   ```
3. Je vais exécuter le script via MCP et vous donner le résultat !

## 📊 Avantages de MCP Supabase

### Avant MCP
1. Ouvrir le dashboard Supabase
2. Naviguer vers SQL Editor
3. Copier-coller le SQL
4. Exécuter
5. Copier le résultat
6. Revenir à l'IDE

### Avec MCP
1. Demander à Cascade dans l'IDE
2. C'est tout ! ✨

### Workflow optimal

```
Vous → "Active RLS sur la table X"
Cascade → Exécute via MCP → Confirme
```

## 🛠️ Dépannage

### Le serveur MCP ne démarre pas

**Erreur** : `Cannot find module 'mcp-remote'`

**Solution** :
```bash
# Installer mcp-remote globalement
npm install -g mcp-remote

# Ou utiliser npx (déjà dans la config)
# npx télécharge et exécute automatiquement
```

### Erreur d'authentification

**Erreur** : `Authentication failed`

**Solution** : Vérifiez que votre `project_ref` est correct dans l'URL :
```
project_ref=sxrofrdhpzpjqkplgoij
```

### Le serveur ne répond pas

**Solution** :
1. Vérifier votre connexion internet
2. Tester l'URL directement :
   ```bash
   curl "https://mcp.supabase.com/mcp?project_ref=sxrofrdhpzpjqkplgoij"
   ```

## 🎓 Exemples pratiques

### 1. Corriger les 169 issues RLS

**Avant (manuel)** :
- Ouvrir dashboard Supabase
- SQL Editor
- Copier le script
- Exécuter
- Vérifier les résultats

**Maintenant (avec MCP)** :
```
Vous : "Exécute le script supabase/fix-rls-issues.sql"
Cascade : [Exécute via MCP] ✅ Script exécuté, 169 issues résolues
```

### 2. Déboguer une erreur 403

**Avant** :
- Chercher dans les logs
- Vérifier les politiques RLS manuellement
- Tester différentes requêtes

**Maintenant** :
```
Vous : "Pourquoi j'ai une erreur 403 sur SELECT * FROM bookings ?"
Cascade : [Analyse via MCP] 
  → RLS activé ✅
  → Aucune politique SELECT pour cette table ❌
  → Voici la politique manquante...
```

### 3. Créer une nouvelle table avec RLS

**Avant** :
- Créer la table via SQL Editor
- Activer RLS manuellement
- Créer les politiques une par une
- Tester

**Maintenant** :
```
Vous : "Crée une table 'notifications' avec RLS activé et les bonnes politiques"
Cascade : [Crée tout via MCP] ✅ Table créée avec 3 politiques RLS
```

## 🔐 Sécurité

### Que peut faire le serveur MCP ?

Le serveur MCP Supabase a accès à :
- ✅ Votre projet spécifique (sxrofrdhpzpjqkplgoij)
- ✅ Requêtes SQL
- ✅ Gestion des politiques RLS
- ✅ Stockage et fonctions

### Ce qu'il ne peut PAS faire

- ❌ Accéder à d'autres projets Supabase
- ❌ Modifier votre compte Supabase
- ❌ Supprimer votre projet
- ❌ Accéder aux données sensibles (mots de passe hashés)

### Bonnes pratiques

1. **Ne partagez pas votre URL MCP** : Elle contient votre `project_ref`
2. **Utilisez RLS** : MCP ne contourne pas les politiques RLS
3. **Vérifiez les requêtes** : Comme pour toute requête SQL

## 📚 Ressources

- [Documentation MCP](https://modelcontextprotocol.io/)
- [Supabase MCP Server](https://mcp.supabase.com/)
- [Supabase Documentation](https://supabase.com/docs)

## 🎯 Prochaines étapes

1. **Ajoutez la configuration** dans `~/.codeium/windsurf/mcp_config.json`
2. **Redémarrez Windsurf**
3. **Demandez-moi** d'exécuter le script RLS : "Exécute supabase/fix-rls-issues.sql"
4. **Profitez** de la gestion Supabase directement dans l'IDE ! 🚀

---

**Note** : Cette configuration est spécifique à votre projet FloService. Si vous travaillez sur d'autres projets Supabase, vous devrez ajouter d'autres serveurs MCP avec leurs `project_ref` respectifs.
