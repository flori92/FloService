# Guide d'installation des fonctions Supabase pour FloService

Ce document explique comment installer et configurer les fonctions SQL nécessaires au bon fonctionnement de FloService dans votre projet Supabase.

## Fonction `is_provider`

Cette fonction est essentielle pour vérifier si un utilisateur est un prestataire. Elle est utilisée par l'application pour déterminer les droits d'accès et afficher les fonctionnalités appropriées.

### Installation

1. Connectez-vous à votre [Dashboard Supabase](https://app.supabase.com/)
2. Sélectionnez votre projet FloService
3. Naviguez vers l'onglet "SQL Editor"
4. Créez une nouvelle requête
5. Copiez-collez le contenu du fichier `create_is_provider_function.sql`
6. Exécutez la requête

### Vérification

Pour vérifier que la fonction a été correctement installée :

1. Naviguez vers l'onglet "Database" > "Functions"
2. Vous devriez voir `is_provider` dans la liste des fonctions
3. Vous pouvez tester la fonction avec la requête suivante :

```sql
SELECT is_provider('VOTRE_USER_ID_ICI');
```

## Résolution des problèmes courants

### Erreur 404 (Not Found)

Si vous rencontrez toujours des erreurs 404 lors de l'appel à la fonction `is_provider`, vérifiez les points suivants :

1. La fonction existe bien dans votre base de données
2. Les permissions sont correctement configurées (anon et authenticated doivent avoir les droits d'exécution)
3. Le schéma utilisé est bien `public`

### Erreur 406 (Not Acceptable)

Si vous rencontrez des erreurs 406, vérifiez que les en-têtes HTTP sont correctement configurés dans votre client Supabase :

```typescript
const supabaseOptions = {
  global: {
    headers: {
      'Accept': 'application/json, */*',
      'Content-Type': 'application/json',
      'Accept-Profile': 'public',
      'Content-Profile': 'public',
      'apikey': supabaseKey,
      'Prefer': 'return=representation',
    },
  },
};
```

## Autres fonctions utiles

D'autres fonctions SQL peuvent être nécessaires pour le bon fonctionnement de FloService. Consultez le répertoire `scripts/` pour plus d'informations.
