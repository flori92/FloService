# Intégration Kkiapay dans FloService

## Présentation

Ce module intègre Kkiapay comme agrégateur de paiement dans FloService, permettant :
- Le paiement par mobile money et carte bancaire
- Le séquestre des fonds jusqu'à validation du service
- Le retrait des fonds par les prestataires (avec commission)
- La génération d'offres avec liens de paiement

## Structure des données

### Tables Supabase
- `payments` : Gestion des paiements et du séquestre
- `withdrawals` : Gestion des demandes de retrait
- `service_offers` : Gestion des offres avec liens de paiement
- `notifications` : Notifications des événements de paiement

## Workflow de paiement

1. **Paiement client** :
   - Via widget Kkiapay ou lien de paiement
   - Séquestre automatique (statut `escrow`)

2. **Validation de service** :
   - Passage du statut à `available`
   - Notification au prestataire

3. **Retrait prestataire** :
   - Demande via dashboard
   - Commission de 100 FCFA prélevée
   - Transfert mobile money automatisé

## Fonctions Edge Supabase

- `generate_payment_link.ts` : Génération de liens de paiement
- `kkiapay_webhook.ts` : Traitement des callbacks Kkiapay
- `kkiapay_withdrawal.ts` : Traitement des retraits

## Composants React

- `KkiapayPaymentButton` : Bouton de paiement avancé
- `ProviderBalanceSection` : Gestion du solde prestataire
- `CreateServiceOfferForm` : Création d'offres avec lien de paiement
- `ClientOffersList` : Affichage des offres pour le client
- `ChatOfferButton` : Intégration dans le chat

## Configuration

Ajoutez ces variables d'environnement :
```
VITE_KKIAPAY_PUBLIC_KEY=votre_cle_publique
KKIAPAY_PRIVATE_KEY=votre_cle_privee
```

## Déploiement des fonctions Edge

```bash
supabase functions deploy generate_payment_link
supabase functions deploy kkiapay_webhook
supabase functions deploy kkiapay_withdrawal
```

## Webhook Kkiapay

Configurez le webhook dans votre dashboard Kkiapay :
```
https://[votre-projet].supabase.co/functions/v1/kkiapay_webhook
```

## Fonctionnalités avancées

- **Paiements récurrents** : Utilisez l'option `frequency` dans KkiapayPaymentButton
- **Split payments** : Utilisez l'option `splitPayment` pour partager les revenus
- **Personnalisation** : Thème, logo, description personnalisables

---

Pour toute question : support@floservice.com
