// Script pour vérifier la structure de la table conversations sur Supabase
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sxrofrdhpzpjqkplgoij.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cm9mcmRocHpwanFrcGxnb2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNjY2NzksImV4cCI6MjA2Mzc0MjY3OX0.ddLsIbp814amozono-gIhjNPWYE4Lgo20dJmG3Q-Cww';
const supabase = createClient(supabaseUrl, supabaseKey);

// Fonction pour vérifier les données
async function checkData() {
  try {
    // 1. Essayons de récupérer un enregistrement pour voir les champs
    console.log("Tentative de récupération d'un enregistrement de la table conversations...");
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error("Erreur lors de la récupération d'un enregistrement:", error);
    } else if (data && data.length > 0) {
      console.log("Exemple d'enregistrement:", data[0]);
      console.log("Colonnes détectées:", Object.keys(data[0]));
    } else {
      console.log("Aucun enregistrement trouvé dans la table conversations");
      
      // 2. Testons l'insertion pour voir si la table accepte service_id ou provider_id
      console.log("\nTest d'insertion avec service_id...");
      const { error: serviceIdError } = await supabase
        .from('conversations')
        .insert({
          client_id: '00000000-0000-0000-0000-000000000000', // ID factice
          service_id: '00000000-0000-0000-0000-000000000000'  // ID factice
        })
        .select();
      
      console.log("Résultat insertion avec service_id:", serviceIdError ? `Erreur: ${serviceIdError.message}` : "Succès");
      
      // Nettoyons cette insertion si elle a réussi
      if (!serviceIdError) {
        await supabase
          .from('conversations')
          .delete()
          .match({ client_id: '00000000-0000-0000-0000-000000000000' });
      }

      console.log("\nTest d'insertion avec provider_id...");
      const { error: providerIdError } = await supabase
        .from('conversations')
        .insert({
          client_id: '00000000-0000-0000-0000-000000000000', // ID factice
          provider_id: '00000000-0000-0000-0000-000000000000'  // ID factice
        })
        .select();
      
      console.log("Résultat insertion avec provider_id:", providerIdError ? `Erreur: ${providerIdError.message}` : "Succès");
      
      // Nettoyons cette insertion si elle a réussi
      if (!providerIdError) {
        await supabase
          .from('conversations')
          .delete()
          .match({ client_id: '00000000-0000-0000-0000-000000000000' });
      }
    }
  } catch (e) {
    console.error("Exception:", e);
  }
}

// Exécuter la vérification
checkData();
