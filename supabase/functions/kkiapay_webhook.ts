// @ts-nocheck - Deno Edge Function environment - Ces erreurs sont normales en développement local
// et seront résolues lors du déploiement sur Supabase
import { serve } from 'std/server';
import * as crypto from 'crypto';

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
          
          // 4. Générer automatiquement une facture
          const amount = offer.amount;
          const commission = 100; // Commission fixe de 100 FCFA
          const taxRate = 18; // TVA à 18%
          const taxAmount = Math.round((amount * taxRate) / 100);
          const totalAmount = amount + taxAmount;
          const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
          
          // Récupérer les détails du prestataire et du client
          const { data: providerData } = await supabase
            .from('profiles')
            .select('id, full_name, business_name, email, phone, address')
            .eq('id', offer.provider_id)
            .single();
            
          const { data: clientData } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone, address')
            .eq('id', offer.client_id)
            .single();
          
          // Créer l'entrée de facture
          const { data: invoiceData, error: invoiceError } = await supabase
            .from('invoices')
            .insert({
              offer_id: offer.id,
              provider_id: offer.provider_id,
              client_id: offer.client_id,
              amount: amount,
              commission: commission,
              tax_rate: taxRate,
              tax_amount: taxAmount,
              total_amount: totalAmount,
              status: 'draft',
              invoice_number: invoiceNumber,
              provider_details: providerData,
              client_details: clientData
            })
            .select()
            .single();
          
          if (!invoiceError && invoiceData) {
            // Générer le PDF de facture
            const { data: pdfData, error: pdfError } = await supabase
              .functions.invoke('generate_invoice_pdf', {
                body: { invoice_id: invoiceData.id }
              });
            
            if (!pdfError && pdfData?.url) {
              // Mettre à jour l'URL de la facture
              await supabase
                .from('invoices')
                .update({ 
                  invoice_url: pdfData.url,
                  status: 'paid'
                })
                .eq('id', invoiceData.id);
              
              // Envoyer la facture par email
              await supabase
                .functions.invoke('send_invoice_email', {
                  body: { invoice_id: invoiceData.id }
                });
            }
          }
          
          // 5. Notifier le prestataire et le client
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
              content: `Votre paiement de ${offer.amount} FCFA a été effectué avec succès. Une facture vous a été envoyée par email.`
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
