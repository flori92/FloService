// @ts-nocheck - Deno Edge Function environment - Ces erreurs sont normales en développement local
// et seront résolues lors du déploiement sur Supabase
import { serve } from 'std/server';

serve(async (req) => {
  try {
    const { offer_id, amount, description } = await req.json();
    
    if (!offer_id || !amount) {
      return new Response(JSON.stringify({ error: 'Paramètres manquants' }), { status: 400 });
    }

    // Récupération des variables d'environnement
    const KKIAPAY_PRIVATE_KEY = Deno.env.get('KKIAPAY_PRIVATE_KEY');
    if (!KKIAPAY_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: 'Clé privée Kkiapay non configurée' }), { status: 500 });
    }

    // Générer le lien de paiement via l'API Kkiapay
    const response = await fetch('https://api.kkiapay.me/api/v1/payments/link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KKIAPAY_PRIVATE_KEY}`
      },
      body: JSON.stringify({
        amount: amount,
        reason: description || `Paiement FloService - Offre #${offer_id.substring(0, 8)}`,
        expiration: "168h", // 7 jours (168 heures)
        callback_url: `${Deno.env.get('PUBLIC_URL')}/api/payment-callback?offer_id=${offer_id}`,
        data: JSON.stringify({ offer_id, type: 'service_offer' })
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return new Response(JSON.stringify({ error: 'Erreur API Kkiapay', details: errorData }), { status: 500 });
    }

    const data = await response.json();
    return new Response(JSON.stringify({ 
      url: data.paymentLink,
      id: data.paymentLinkId
    }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erreur serveur', details: err.message }), { status: 500 });
  }
});
