// Script pour vérifier la structure de la table conversations sur Supabase
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sxrofrdhpzpjqkplgoij.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cm9mcmRocHpwanFrcGxnb2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNjY2NzksImV4cCI6MjA2Mzc0MjY3OX0.ddLsIbp814amozono-gIhjNPWYE4Lgo20dJmG3Q-Cww';
const supabase = createClient(supabaseUrl, supabaseKey);

// Fonction pour vérifier la structure de la table
async function checkTableStructure() {
  // Vérifier les colonnes de la table conversations
  console.log("Vérification de la structure de la table conversations...");
  
  try {
    // Requête utilisant pg_catalog pour obtenir les informations de colonnes
    const { data, error } = await supabase.rpc('get_table_info', { table_name: 'conversations' });
    
    if (error) {
      console.error("Erreur lors de la récupération de la structure:", error);
      return;
    }
    
    console.log("Structure de la table 'conversations':", data);
  } catch (e) {
    console.error("Exception:", e);
  }

  // Essayons une approche alternative - récupérer un enregistrement pour voir les champs
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error("Erreur lors de la récupération d'un enregistrement:", error);
    } else if (data && data.length > 0) {
      console.log("Exemple d'enregistrement (pour voir les colonnes):", data[0]);
      console.log("Colonnes détectées:", Object.keys(data[0]));
    } else {
      console.log("Aucun enregistrement trouvé dans la table conversations");
    }
  } catch (e) {
    console.error("Exception:", e);
  }
}

// Exécuter la vérification
checkTableStructure();
