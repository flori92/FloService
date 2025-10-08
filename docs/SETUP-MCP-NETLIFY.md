# Configuration MCP Netlify pour FloService

## 🎯 Qu'est-ce que MCP Netlify ?

Le serveur MCP Netlify officiel (`@netlify/mcp`) vous permet de gérer votre déploiement Netlify **directement depuis Windsurf**, sans ouvrir le dashboard.

### Fonctionnalités disponibles

- ✅ **Déploiements** : Déclencher builds et déploiements
- ✅ **Variables d'environnement** : Gérer les env vars
- ✅ **Logs** : Consulter les logs de build et fonctions
- ✅ **Sites** : Lister et gérer vos sites
- ✅ **Domaines** : Gérer les domaines personnalisés
- ✅ **Preview Branches** : Créer des branches de preview
- ✅ **Functions** : Gérer les Netlify Functions

## 📥 Installation

### Configuration déjà appliquée ✅

Le serveur MCP Netlify a été ajouté à votre configuration :

```json
{
  "mcpServers": {
    "netlify": {
      "command": "npx",
      "args": ["-y", "@netlify/mcp"]
    }
  }
}
```

**Emplacement** : `~/.codeium/windsurf/mcp_config.json`

### Activation

**Pour activer le serveur MCP Netlify** :
1. **Redémarrez Windsurf** (fermez complètement et relancez)
2. Le serveur sera automatiquement chargé au démarrage

## 🚀 Utilisation

### Après redémarrage de Windsurf

Une fois Windsurf redémarré, vous pourrez me demander :

#### **Gérer les déploiements**
```
"Déploie FloService en production sur Netlify"
"Montre-moi le statut du dernier déploiement"
"Annule le déploiement en cours"
```

#### **Variables d'environnement**
```
"Liste les variables d'environnement Netlify"
"Ajoute une variable VITE_API_KEY sur Netlify"
"Change la valeur de VITE_SUPABASE_URL"
```

#### **Consulter les logs**
```
"Montre-moi les logs du dernier build"
"Y a-t-il des erreurs dans les logs Netlify?"
"Affiche les logs de la fonction hello"
```

#### **Gérer les sites**
```
"Liste tous mes sites Netlify"
"Crée un nouveau site pour FloService-staging"
"Change le nom du site en floservice-prod"
```

#### **Preview branches**
```
"Crée une preview branch pour la branche feature/google-auth"
"Supprime la preview branch develop"
```

## 🎬 Exemples pratiques

### Scénario 1 : Déploiement rapide

**Avant (manuel)** :
1. Ouvrir dashboard Netlify
2. Naviguer vers le site
3. Cliquer sur "Deploys"
4. "Trigger deploy"
5. Attendre et vérifier

**Maintenant (avec MCP)** :
```
Vous : "Déploie FloService en production"
Moi : [Déploie via MCP] ✅ Déploiement déclenché, ID: 123abc
```

### Scénario 2 : Debug d'un build qui échoue

**Avant (manuel)** :
1. Ouvrir dashboard
2. Trouver le build
3. Copier les logs
4. Analyser

**Maintenant (avec MCP)** :
```
Vous : "Pourquoi le dernier build a échoué?"
Moi : [Analyse les logs via MCP]
  → Erreur ligne 154 de package.json
  → Dépendance manquante: @types/react
```

### Scénario 3 : Gestion des variables

**Avant (manuel)** :
1. Dashboard > Site settings
2. Build & deploy > Environment
3. Edit variables
4. Redéployer

**Maintenant (avec MCP)** :
```
Vous : "Change VITE_API_URL en https://api.floservice.com"
Moi : [Met à jour via MCP] ✅ Variable mise à jour
Vous : "Redéploie avec les nouvelles variables"
Moi : [Redéploie] ✅ Build en cours...
```

## 📋 Commandes disponibles via MCP

### Déploiements
- `netlify.deploy` - Déployer le site
- `netlify.getLatestDeploy` - Info sur le dernier déploiement
- `netlify.cancelDeploy` - Annuler un déploiement
- `netlify.getDeploys` - Lister les déploiements

### Variables d'environnement
- `netlify.listEnvVars` - Lister les variables
- `netlify.setEnvVar` - Définir/modifier une variable
- `netlify.deleteEnvVar` - Supprimer une variable

### Logs
- `netlify.getBuildLogs` - Logs de build
- `netlify.getFunctionLogs` - Logs des fonctions
- `netlify.getDeployLog` - Log d'un déploiement spécifique

### Sites
- `netlify.listSites` - Lister tous les sites
- `netlify.getSite` - Info sur un site
- `netlify.updateSite` - Modifier config du site
- `netlify.createSite` - Créer un nouveau site

### Domaines
- `netlify.listDomains` - Lister les domaines
- `netlify.addDomain` - Ajouter un domaine
- `netlify.removeDomain` - Retirer un domaine

## 🔐 Authentification

### Première utilisation

Le MCP Netlify utilise votre authentification Netlify CLI existante.

**Si vous n'êtes pas authentifié** :
```bash
netlify login
```

Le MCP utilisera automatiquement ces credentials.

### Vérifier l'authentification

```bash
netlify status
```

Vous devriez voir votre compte Netlify connecté.

## 🎯 Avantages pour FloService

### Workflow actuel amélioré

**1. Déploiement après corrections** :
```
Vous : "J'ai corrigé les bugs, déploie en production"
Moi : [Build + Deploy via MCP]
  → Build démarré
  → Tests passés ✅
  → Déploiement en cours
  → URL : https://floservice-fixed-0937u.netlify.app
```

**2. Configuration automatique** :
```
Vous : "Assure-toi que toutes les variables Supabase sont configurées"
Moi : [Vérifie via MCP]
  → VITE_SUPABASE_URL ✅
  → VITE_SUPABASE_ANON_KEY ✅
  → Toutes les variables sont correctes
```

**3. Monitoring continu** :
```
Vous : "Le site fonctionne en production?"
Moi : [Vérifie via MCP]
  → Dernier déploiement : Réussi ✅
  → Status : Live
  → Dernière erreur : Aucune
```

## 🛠️ Configuration avancée

### Sites multiples

Si vous avez plusieurs sites Netlify :

```json
{
  "mcpServers": {
    "netlify-prod": {
      "command": "npx",
      "args": ["-y", "@netlify/mcp"],
      "env": {
        "NETLIFY_SITE_ID": "floservice-fixed-0937u"
      }
    },
    "netlify-staging": {
      "command": "npx",
      "args": ["-y", "@netlify/mcp"],
      "env": {
        "NETLIFY_SITE_ID": "floservice-staging"
      }
    }
  }
}
```

### Variables d'environnement personnalisées

```json
{
  "netlify": {
    "command": "npx",
    "args": ["-y", "@netlify/mcp"],
    "env": {
      "NETLIFY_AUTH_TOKEN": "votre_token_personnel",
      "NETLIFY_SITE_ID": "site_id_par_defaut"
    }
  }
}
```

## 🐛 Dépannage

### Le serveur MCP ne démarre pas

**Erreur** : `Cannot find module '@netlify/mcp'`

**Solution** :
```bash
# Installer globalement
npm install -g @netlify/mcp

# Ou laisser npx le télécharger automatiquement
# (déjà configuré avec npx -y)
```

### Erreur d'authentification

**Erreur** : `Not logged in`

**Solution** :
```bash
netlify login
netlify status
```

### Le serveur ne répond pas

**Solution** :
1. Vérifier que Netlify CLI fonctionne :
   ```bash
   netlify --version
   netlify status
   ```

2. Tester l'API Netlify :
   ```bash
   netlify sites:list
   ```

3. Redémarrer Windsurf

## 📚 Ressources

- [Netlify MCP Server](https://docs.netlify.com/welcome/build-with-ai/netlify-mcp-server/)
- [Netlify CLI Documentation](https://docs.netlify.com/cli/get-started/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## 🔄 Combinaison MCP Supabase + Netlify

### Workflow complet automatisé

```
1. Vous : "Corrige le bug de connexion"
   Moi : [Analyse + Fix le code]

2. Vous : "Vérifie que RLS est correct dans Supabase"
   Moi : [Vérifie via MCP Supabase] ✅

3. Vous : "Déploie en production"
   Moi : [Build + Deploy via MCP Netlify] ✅

4. Vous : "Tout fonctionne?"
   Moi : [Vérifie les deux]
     → Supabase : 0 issues ✅
     → Netlify : Déployé avec succès ✅
```

### Pipeline CI/CD géré par MCP

Au lieu de GitHub Actions, utilisez MCP :
```
Commit → Push → "Déploie si les tests passent"
```

Je vérifie et déploie automatiquement !

## 🎊 Avantages finaux

| Avant MCP | Avec MCP Netlify |
|-----------|------------------|
| Ouvrir dashboard | Demander dans le chat |
| Copier-coller logs | Analyse automatique |
| Manuel multi-étapes | Une seule commande |
| Context switching | Tout dans l'IDE |
| 5-10 min par action | 10 secondes |

## ✅ Prochaines étapes

1. **Redémarrez Windsurf** pour activer MCP Netlify
2. **Testez** : "Liste mes sites Netlify"
3. **Déployez** : "Déploie FloService en production"
4. **Profitez** de la gestion complète depuis l'IDE ! 🚀

---

**Note** : Le MCP Netlify est maintenant configuré et prêt. Redémarrez Windsurf pour commencer à l'utiliser !
