// @ts-nocheck - Deno Edge Function environment - Ces erreurs sont normales en développement local
// et seront résolues lors du déploiement sur Supabase
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import * as PDFLib from 'https://esm.sh/pdf-lib@1.17.1';
import { format } from 'https://deno.land/std@0.168.0/datetime/mod.ts';

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

    // Créer un nouveau document PDF
    const pdfDoc = await PDFLib.PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // Format A4
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);

    // Ajouter le logo FloService (à remplacer par votre propre logo)
    // const logoUrl = 'https://floservice.com/logo.png';
    // const logoResponse = await fetch(logoUrl);
    // const logoImageBytes = await logoResponse.arrayBuffer();
    // const logoImage = await pdfDoc.embedPng(logoImageBytes);
    // page.drawImage(logoImage, {
    //   x: 50,
    //   y: height - 100,
    //   width: 100,
    //   height: 50,
    // });

    // Titre de la facture
    page.drawText('FACTURE', {
      x: width / 2 - 50,
      y: height - 50,
      size: 24,
      font: boldFont,
    });

    // Numéro de facture et date
    page.drawText(`Facture N° ${invoice.invoice_number}`, {
      x: 50,
      y: height - 100,
      size: 12,
      font: boldFont,
    });

    const formattedDate = format(new Date(invoice.created_at), 'dd/MM/yyyy');
    page.drawText(`Date: ${formattedDate}`, {
      x: 50,
      y: height - 120,
      size: 12,
      font,
    });

    // Informations du prestataire
    const provider = invoice.provider_details || {};
    page.drawText('Prestataire:', {
      x: 50,
      y: height - 160,
      size: 12,
      font: boldFont,
    });
    page.drawText(`${provider.business_name || provider.full_name || 'N/A'}`, {
      x: 50,
      y: height - 180,
      size: 12,
      font,
    });
    page.drawText(`Email: ${provider.email || 'N/A'}`, {
      x: 50,
      y: height - 200,
      size: 12,
      font,
    });
    page.drawText(`Téléphone: ${provider.phone || 'N/A'}`, {
      x: 50,
      y: height - 220,
      size: 12,
      font,
    });
    page.drawText(`Adresse: ${provider.address || 'N/A'}`, {
      x: 50,
      y: height - 240,
      size: 12,
      font,
    });

    // Informations du client
    const client = invoice.client_details || {};
    page.drawText('Client:', {
      x: width - 200,
      y: height - 160,
      size: 12,
      font: boldFont,
    });
    page.drawText(`${client.full_name || 'N/A'}`, {
      x: width - 200,
      y: height - 180,
      size: 12,
      font,
    });
    page.drawText(`Email: ${client.email || 'N/A'}`, {
      x: width - 200,
      y: height - 200,
      size: 12,
      font,
    });
    page.drawText(`Téléphone: ${client.phone || 'N/A'}`, {
      x: width - 200,
      y: height - 220,
      size: 12,
      font,
    });
    page.drawText(`Adresse: ${client.address || 'N/A'}`, {
      x: width - 200,
      y: height - 240,
      size: 12,
      font,
    });

    // Tableau des prestations
    const tableTop = height - 300;
    const rowHeight = 30;
    const col1 = 50;
    const col2 = 300;
    const col3 = 400;
    const col4 = 500;

    // En-têtes du tableau
    page.drawRectangle({
      x: col1,
      y: tableTop - rowHeight,
      width: col4 - col1,
      height: rowHeight,
      color: PDFLib.rgb(0.9, 0.9, 0.9),
      borderWidth: 1,
      borderColor: PDFLib.rgb(0, 0, 0),
    });

    page.drawText('Description', {
      x: col1 + 10,
      y: tableTop - rowHeight / 2 - 6,
      size: 12,
      font: boldFont,
    });

    page.drawText('Quantité', {
      x: col2 + 10,
      y: tableTop - rowHeight / 2 - 6,
      size: 12,
      font: boldFont,
    });

    page.drawText('Prix unitaire', {
      x: col3 + 10,
      y: tableTop - rowHeight / 2 - 6,
      size: 12,
      font: boldFont,
    });

    page.drawText('Total', {
      x: col4 - 40,
      y: tableTop - rowHeight / 2 - 6,
      size: 12,
      font: boldFont,
    });

    // Ligne de prestation
    const row1 = tableTop - rowHeight * 2;
    page.drawRectangle({
      x: col1,
      y: row1,
      width: col4 - col1,
      height: rowHeight,
      borderWidth: 1,
      borderColor: PDFLib.rgb(0, 0, 0),
    });

    page.drawText('Prestation de service', {
      x: col1 + 10,
      y: row1 + rowHeight / 2 - 6,
      size: 12,
      font,
    });

    page.drawText('1', {
      x: col2 + 10,
      y: row1 + rowHeight / 2 - 6,
      size: 12,
      font,
    });

    page.drawText(`${invoice.amount} FCFA`, {
      x: col3 + 10,
      y: row1 + rowHeight / 2 - 6,
      size: 12,
      font,
    });

    page.drawText(`${invoice.amount} FCFA`, {
      x: col4 - 70,
      y: row1 + rowHeight / 2 - 6,
      size: 12,
      font,
    });

    // Résumé des montants
    const summaryY = row1 - 100;
    page.drawText('Sous-total:', {
      x: col3,
      y: summaryY,
      size: 12,
      font,
    });
    page.drawText(`${invoice.amount} FCFA`, {
      x: col4 - 70,
      y: summaryY,
      size: 12,
      font,
    });

    page.drawText(`TVA (${invoice.tax_rate}%):`, {
      x: col3,
      y: summaryY - 20,
      size: 12,
      font,
    });
    page.drawText(`${invoice.tax_amount} FCFA`, {
      x: col4 - 70,
      y: summaryY - 20,
      size: 12,
      font,
    });

    page.drawText('Commission FloService:', {
      x: col3,
      y: summaryY - 40,
      size: 12,
      font,
    });
    page.drawText(`${invoice.commission} FCFA`, {
      x: col4 - 70,
      y: summaryY - 40,
      size: 12,
      font,
    });

    page.drawText('Total:', {
      x: col3,
      y: summaryY - 70,
      size: 14,
      font: boldFont,
    });
    page.drawText(`${invoice.total_amount} FCFA`, {
      x: col4 - 80,
      y: summaryY - 70,
      size: 14,
      font: boldFont,
    });

    // Informations de paiement
    page.drawText('Informations de paiement:', {
      x: 50,
      y: summaryY - 120,
      size: 12,
      font: boldFont,
    });
    page.drawText('Paiement effectué via Kkiapay', {
      x: 50,
      y: summaryY - 140,
      size: 12,
      font,
    });

    // Pied de page
    page.drawText('FloService - Plateforme de services en ligne', {
      x: width / 2 - 120,
      y: 50,
      size: 12,
      font,
    });
    page.drawText('www.floservice.com | support@floservice.com', {
      x: width / 2 - 130,
      y: 30,
      size: 12,
      font,
    });

    // Générer le PDF
    const pdfBytes = await pdfDoc.save();

    // Stocker le PDF dans le bucket Supabase Storage
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('invoices')
      .upload(`${invoice.invoice_number}.pdf`, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (storageError) {
      return new Response(JSON.stringify({ error: 'Erreur lors du stockage du PDF' }), { status: 500 });
    }

    // Récupérer l'URL publique du PDF
    const { data: publicUrlData } = await supabase
      .storage
      .from('invoices')
      .getPublicUrl(`${invoice.invoice_number}.pdf`);

    // Retourner l'URL du PDF
    return new Response(
      JSON.stringify({ 
        success: true, 
        url: publicUrlData.publicUrl,
        message: 'Facture PDF générée avec succès'
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur lors de la génération de la facture PDF', details: error.message }),
      { status: 500 }
    );
  }
});
