// @ts-nocheck - Deno Edge Function environment - Ces erreurs sont normales en développement local
// et seront résolues lors du déploiement sur Supabase
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts';

serve(async (req) => {
  try {
    const { invoice_id } = await req.json();
    
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: 'ID de facture manquant' }), { status: 400 });
    }

    // Récupérer les informations de la base de données
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer les données de la facture
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return new Response(JSON.stringify({ error: 'Facture introuvable' }), { status: 404 });
    }

    // Vérifier que la facture a une URL de PDF
    if (!invoice.invoice_url) {
      return new Response(JSON.stringify({ error: 'URL de facture manquante' }), { status: 400 });
    }

    // Récupérer les détails du client et du prestataire
    const client = invoice.client_details || {};
    const provider = invoice.provider_details || {};

    // Configurer le client SMTP
    const smtpClient = new SmtpClient();
    await smtpClient.connectTLS({
      hostname: Deno.env.get('SMTP_HOST') || 'smtp.gmail.com',
      port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
      username: Deno.env.get('SMTP_USERNAME'),
      password: Deno.env.get('SMTP_PASSWORD'),
    });

    // Construire le contenu de l'email
    const emailContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Facture FloService</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { color: #2b6cb0; }
        .details { margin-bottom: 20px; }
        .details p { margin: 5px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        .button { display: inline-block; background-color: #2b6cb0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Facture FloService</h1>
          <p>Facture N° ${invoice.invoice_number}</p>
        </div>
        
        <div class="details">
          <p>Cher(e) ${client.full_name || 'Client'},</p>
          <p>Veuillez trouver ci-joint votre facture pour les services fournis par ${provider.business_name || provider.full_name || 'Prestataire'}.</p>
          <p><strong>Montant total:</strong> ${invoice.total_amount} FCFA</p>
          <p><strong>Date:</strong> ${new Date(invoice.created_at).toLocaleDateString()}</p>
          <p>Votre paiement a été traité avec succès via Kkiapay.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invoice.invoice_url}" class="button" target="_blank">Télécharger la facture</a>
        </div>
        
        <p>Si vous avez des questions concernant cette facture, n'hésitez pas à contacter notre service client à support@floservice.com.</p>
        
        <div class="footer">
          <p>FloService - Plateforme de services en ligne</p>
          <p>www.floservice.com | support@floservice.com</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // Envoyer l'email
    await smtpClient.send({
      from: Deno.env.get('SMTP_FROM') || 'facturation@floservice.com',
      to: client.email,
      subject: `Facture FloService #${invoice.invoice_number}`,
      content: emailContent,
      html: emailContent,
    });

    await smtpClient.close();

    // Retourner une réponse de succès
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email de facture envoyé avec succès'
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur lors de l\'envoi de l\'email', details: error.message }),
      { status: 500 }
    );
  }
});
