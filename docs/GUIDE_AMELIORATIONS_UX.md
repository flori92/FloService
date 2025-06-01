# Guide des améliorations d'expérience utilisateur pour FloService

Ce document présente les améliorations d'expérience utilisateur implémentées pour résoudre les problèmes d'API et optimiser l'interface utilisateur de FloService.

## Table des matières

1. [Composants UI réutilisables](#composants-ui-réutilisables)
2. [Hooks personnalisés](#hooks-personnalisés)
3. [Utilitaires](#utilitaires)
4. [Client Supabase amélioré](#client-supabase-amélioré)
5. [Exemples d'utilisation](#exemples-dutilisation)
6. [Résolution des erreurs API](#résolution-des-erreurs-api)

## Composants UI réutilisables

### Système de notifications (`Notifier.jsx`)

Un système de notifications élégant pour informer l'utilisateur des actions réussies, des erreurs et des informations importantes.

```jsx
import { NotifierProvider, useNotifier } from '../components/ui/Notifier';

// Dans le composant parent (App.jsx)
<NotifierProvider>
  {/* Contenu de l'application */}
</NotifierProvider>

// Dans n'importe quel composant enfant
const MonComposant = () => {
  const notifier = useNotifier();
  
  const handleClick = () => {
    notifier.success('Opération réussie !');
    // Autres types: notifier.error(), notifier.info(), notifier.warning()
  };
  
  return <button onClick={handleClick}>Cliquez-moi</button>;
};
```

### Indicateurs de chargement (`LoadingSpinner.jsx`)

Indicateurs de chargement avec plusieurs variantes pour améliorer le feedback visuel pendant les opérations asynchrones.

```jsx
import LoadingSpinner, { SPINNER_TYPES, SPINNER_SIZES } from '../components/ui/LoadingSpinner';

// Spinner simple
<LoadingSpinner />

// Spinner personnalisé
<LoadingSpinner 
  type={SPINNER_TYPES.DOTS} 
  size={SPINNER_SIZES.LG} 
  color="#4F46E5" 
  label="Chargement en cours..." 
  fullScreen={true}
/>
```

### États vides (`EmptyState.jsx`)

Composants pour afficher des états vides personnalisés pour différentes situations (pas de messages, pas de résultats de recherche, etc.).

```jsx
import EmptyState, { EmptyMessages, EmptySearch, ConnectionError } from '../components/ui/EmptyState';

// État vide personnalisé
<EmptyState
  icon={<IconComponent />}
  title="Aucun résultat"
  description="Aucun résultat ne correspond à votre recherche."
  action={<button>Action</button>}
/>

// États vides prédéfinis
<EmptyMessages onAction={() => navigate('/providers')} />
<EmptySearch searchTerm="terme" onReset={handleReset} />
<ConnectionError onRetry={handleRetry} />
```

## Hooks personnalisés

### Requêtes Supabase (`useSupabaseQuery.js`)

Hooks pour gérer les requêtes Supabase avec gestion d'état et d'erreurs intégrée.

```jsx
import { useSupabaseRpc, useSupabaseSelect, useSupabaseMutation } from '../utils/hooks/useSupabaseQuery';

// Appel RPC
const { data, isLoading, error, refetch } = useSupabaseRpc(
  'get_messages',
  { p_conversation_id: conversationId, p_limit: 50 },
  { refetchInterval: 5000 } // Rafraîchir toutes les 5 secondes
);

// Requête SELECT
const { data: profiles } = useSupabaseSelect(
  'profiles',
  { 
    select: 'id, full_name, avatar_url',
    eq: { is_provider: true },
    order: { column: 'created_at', ascending: false },
    limit: 10
  }
);

// Mutation (INSERT, UPDATE, DELETE)
const { mutate, isLoading } = useSupabaseMutation(
  'messages', 
  'insert',
  { 
    successMessage: 'Message envoyé avec succès',
    onSuccess: () => refetch()
  }
);

// Utilisation de la mutation
const handleSend = () => {
  mutate({ 
    conversation_id: conversationId,
    sender_id: currentUserId,
    recipient_id: recipientId,
    content: message
  });
};
```

### Abonnements en temps réel (`useRealtimeSubscription.js`)

Hooks pour s'abonner aux changements en temps réel avec Supabase.

```jsx
import { useMessageSubscription, useProfileSubscription } from '../utils/hooks/useRealtimeSubscription';

// S'abonner aux nouveaux messages
const { isSubscribed } = useMessageSubscription(
  currentUserId,
  (newMessage) => {
    // Traiter le nouveau message
    notifier.info('Nouveau message reçu');
    refetch();
  }
);

// S'abonner aux mises à jour de profil
useProfileSubscription(
  currentUserId,
  (newProfile, oldProfile) => {
    // Traiter la mise à jour du profil
  }
);
```

## Utilitaires

### Gestion d'erreurs (`errorHandler.js`)

Utilitaire pour gérer les erreurs API de manière centralisée et fournir des messages d'erreur clairs.

```jsx
import { useErrorHandler, safeTableOperation } from '../utils/errorHandler';

const { handleError, getErrorMessage } = useErrorHandler();

try {
  // Opération qui peut échouer
} catch (error) {
  // Affiche une notification d'erreur avec un message convivial
  handleError(error);
  
  // Ou récupérer juste le message sans notification
  const message = getErrorMessage(error);
}

// Opération sécurisée sur une table (vérifie si la table existe)
const result = await safeTableOperation(
  supabase,
  'messages',
  () => supabase.from('messages').select('*'),
  () => ({ data: [], error: null }) // Fallback si la table n'existe pas
);
```

## Client Supabase amélioré

Un client Supabase amélioré avec gestion d'erreurs et fonctionnalités supplémentaires.

```jsx
import enhancedSupabase from '../lib/supabaseClient';

// Méthodes sécurisées
const profile = await enhancedSupabase.getUserProfile(userId);
const isProvider = await enhancedSupabase.isProvider(userId);
const conversation = await enhancedSupabase.getOrCreateConversation(userId1, userId2);
const messages = await enhancedSupabase.getMessages(conversationId);
const count = await enhancedSupabase.getMessageCount(conversationId);

// Opération sécurisée
await enhancedSupabase.safeOperation(
  'messages',
  () => enhancedSupabase.from('messages').select('*'),
  () => ({ data: [], error: null })
);
```

## Exemples d'utilisation

### Page de messagerie

La page de messagerie (`MessagesPage.jsx`) montre comment utiliser tous ces composants ensemble pour créer une expérience utilisateur fluide et réactive.

Principales fonctionnalités :
- Chargement progressif des messages
- Notifications en temps réel pour les nouveaux messages
- Gestion des erreurs avec messages conviviaux
- États vides pour guider l'utilisateur
- Indicateurs de chargement pour les opérations asynchrones

## Résolution des erreurs API

Les erreurs 400 et 406 sont résolues grâce à :

1. **Vérification préalable de l'existence des tables**
   ```javascript
   // Au lieu de
   supabase.from('messages').select('count(*)')
   
   // Utiliser
   enhancedSupabase.getMessageCount(conversationId)
   ```

2. **Utilisation de fonctions RPC sécurisées**
   ```javascript
   // Au lieu de
   supabase.from('profiles').select('is_provider').eq('id', userId)
   
   // Utiliser
   enhancedSupabase.isProvider(userId)
   ```

3. **Gestion proactive des erreurs**
   ```javascript
   const { data, error } = await enhancedSupabase.rpc('safe_message_count', { 
     p_conversation_id: conversationId 
   });
   
   if (error) {
     // Traiter l'erreur de manière élégante
     return 0; // Valeur par défaut
   }
   ```

4. **Hooks avec gestion d'état intégrée**
   ```javascript
   const { data, isLoading, error } = useSupabaseRpc('get_messages', params);
   
   // Affichage conditionnel basé sur l'état
   if (isLoading) return <LoadingSpinner />;
   if (error) return <ErrorMessage message={error.message} />;
   ```

---

Ces améliorations d'expérience utilisateur complètent les corrections de sécurité déjà effectuées, offrant une application à la fois sécurisée et agréable à utiliser.
