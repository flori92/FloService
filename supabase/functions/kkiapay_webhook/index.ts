// @ts-nocheck - Deno Edge Function environment - Ces erreurs sont normales en développement local
// et seront résolues lors du déploiement sur Supabase
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import * as crypto from 'https://deno.land/std@0.168.0/node/crypto.ts';

// Interface pour les métadonnées d'une transaction
interface TransactionMetadata {
  type?: string;
  offer_id?: string;
  [key: string]: any;
}

/**
 * Vérifie la signature du webhook Kkiapay
 * @param payload Le contenu de la requête
 * @param signature La signature fournie dans l'en-tête X-Kkiapay-Signature
 * @param secret Le secret du webhook configuré dans Supabase
 * @returns true si la signature est valide
 */
function verifySignature(payload: any, signature: string | null, secret: string | null): boolean {
  if (!signature || !secret) return false;
  
  try {
    // Création d'un hash HMAC-SHA256 du payload avec le secret
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadString);
    const calculatedSignature = hmac.digest('hex');
    
    // Comparaison des signatures (en mode développement, on peut être plus permissif)
    return calculatedSignature === signature || Deno.env.get('SUPABASE_ENV') === 'development';
  } catch (error) {
    console.error('Erreur lors de la vérification de signature:', error);
    return false;
  }
}

serve(async (req) => {
  try {
    // Lecture du corps de la requête une seule fois
    const rawBody = await req.text();
    let payload;
    
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Payload JSON invalide' }), { status: 400 });
    }
    
    // Vérification de sécurité
    const signature = req.headers.get('X-Kkiapay-Signature');
    const KKIAPAY_WEBHOOK_SECRET = Deno.env.get('KKIAPAY_WEBHOOK_SECRET');
    
    // Vérification de la signature
    if (!verifySignature(rawBody, signature, KKIAPAY_WEBHOOK_SECRET)) {
      console.error('Signature webhook invalide');
      return new Response(JSON.stringify({ error: 'Signature invalide' }), { status: 401 });
    }
    
    // Récupération de la clé privée pour les opérations API
    const KKIAPAY_PRIVATE_KEY = Deno.env.get('KKIAPAY_PRIVATE_KEY');
    
    // Récupérer la connexion Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Traiter selon le type d'événement
    if (payload.event === 'transaction.successful') {
      const transactionData = payload.data;
      
      // Extraire les données métier
      let metadata: TransactionMetadata = {};
      try {
        metadata = JSON.parse(transactionData.metadata || '{}') as TransactionMetadata;
      } catch (e) {
        console.error('Erreur parsing metadata:', e);
      }
      
      if (metadata.type === 'service_offer' && metadata.offer_id) {
        // 1. Mettre à jour le statut de l'offre
        await supabase
          .from('service_offers')
          .update({ 
            status: 'paid',
            paid_at: new Date().toISOString()
          })
          .eq('id', metadata.offer_id);
        
        // 2. Récupérer les détails de l'offre
        const { data: offer } = await supabase
          .from('service_offers')
          .select('*')
          .eq('id', metadata.offer_id)
          .single();
        
        if (offer) {
          // 3. Créer l'entrée dans payments (séquestre)
          await supabase
            .from('payments')
            .insert({
              provider_id: offer.provider_id,
              client_id: offer.client_id,
              amount: offer.amount,
              commission: 100,
              status: 'escrow',
              created_at: new Date().toISOString()
            });
          
          // 4. Notifier le prestataire et le client
          await supabase.from('notifications').insert([
            {
              user_id: offer.provider_id,
              type: 'payment',
              title: 'Paiement reçu',
              content: `Votre offre de ${offer.amount} FCFA a été payée. Le montant est en séquestre.`
            },
            {
              user_id: offer.client_id,
              type: 'payment',
              title: 'Paiement effectué',
              content: `Votre paiement de ${offer.amount} FCFA a été effectué avec succès.`
            }
          ]);
        }
      }
    } else if (payload.event === 'transfer.successful') {
      // Mise à jour du statut du retrait
      const transferData = payload.data;
      if (transferData && transferData.transferId) {
        await supabase
          .from('withdrawals')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', transferData.transferId);
        
        // Notifier le prestataire
        const { data: withdrawal } = await supabase
          .from('withdrawals')
          .select('provider_id, amount')
          .eq('id', transferData.transferId)
          .single();
        
        if (withdrawal) {
          await supabase.from('notifications').insert({
            user_id: withdrawal.provider_id,
            type: 'withdrawal',
            title: 'Retrait effectué',
            content: `Votre retrait de ${withdrawal.amount - 100} FCFA a été transféré sur votre portefeuille mobile.`
          });
        }
      }
    }
    
    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Erreur webhook:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
