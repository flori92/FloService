// @ts-nocheck - Deno Edge Function environment - Ces erreurs sont normales en développement local
// et seront résolues lors du déploiement sur Supabase
// Supabase Edge Function pour déclencher un retrait Mobile Money via Kkiapay
// TypeScript - à adapter selon la structure exacte de vos tables et de vos secrets
import { serve } from 'std/server';

serve(async (req) => {
  try {
    const { withdrawal_id } = await req.json();
    if (!withdrawal_id) {
      return new Response(JSON.stringify({ error: 'withdrawal_id manquant' }), { status: 400 });
    }

    // Récupération des variables d'environnement (clé privée Kkiapay)
    const KKIAPAY_PRIVATE_KEY = Deno.env.get('KKIAPAY_PRIVATE_KEY');
    if (!KKIAPAY_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: 'Clé privée Kkiapay non configurée' }), { status: 500 });
    }

    // Récupérer la demande de retrait depuis Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer la demande de retrait
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawal_id)
      .single();
    if (withdrawalError || !withdrawal) {
      return new Response(JSON.stringify({ error: 'Retrait introuvable' }), { status: 404 });
    }
    if (withdrawal.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Statut non valide pour traitement' }), { status: 400 });
    }

    // Appel API Kkiapay pour le transfert Mobile Money
    const transferAmount = withdrawal.amount - withdrawal.commission; // Commission déjà fixée à 100 FCFA
    const payload = {
      amount: transferAmount,
      reason: 'Retrait FloService',
      phone: withdrawal.mobile_wallet_number,
      operator: withdrawal.wallet_operator,
      api_key: KKIAPAY_PRIVATE_KEY
    };

    const kkiapayRes = await fetch('https://api.kkiapay.me/api/v1/transfer/to/mobile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KKIAPAY_PRIVATE_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const kkiapayResult = await kkiapayRes.json();
    if (!kkiapayRes.ok || kkiapayResult.status !== 'success') {
      // Mise à jour du statut en échec
      await supabase
        .from('withdrawals')
        .update({ status: 'failed' })
        .eq('id', withdrawal_id);
      return new Response(JSON.stringify({ error: 'Transfert échoué', details: kkiapayResult }), { status: 500 });
    }

    // Mise à jour du statut du retrait
    await supabase
      .from('withdrawals')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', withdrawal_id);

    // (Optionnel) Mettre à jour la table payments si besoin
    // await supabase.from('payments').update({ status: 'transferred' }).eq(...)

    return new Response(JSON.stringify({ success: true, transfer: kkiapayResult }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erreur serveur', details: err.message }), { status: 500 });
  }
});
