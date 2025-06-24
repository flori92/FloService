// Script de debug pour analyser les données de profil réelles
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugProfileData(userId = 'tg-2') {
  console.log(`🔍 Debug des données de profil pour l'ID: ${userId}`);
  console.log('=' .repeat(60));

  try {
    // 1. Vérifier la structure de la table profiles
    console.log('\n📋 1. Test de la table profiles:');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profileError) {
      console.error('Erreur profiles:', profileError);
    } else {
      console.log('Colonnes disponibles dans profiles:', Object.keys(profiles[0] || {}));
    }

    // 2. Vérifier la structure de la table provider_profiles  
    console.log('\n📋 2. Test de la table provider_profiles:');
    const { data: providers, error: providerError } = await supabase
      .from('provider_profiles')
      .select('*')
      .limit(1);
    
    if (providerError) {
      console.error('Erreur provider_profiles:', providerError);
    } else {
      console.log('Colonnes disponibles dans provider_profiles:', Object.keys(providers[0] || {}));
    }

    // 3. Test avec ID spécifique
    console.log(`\n📋 3. Recherche du profil pour ID: ${userId}`);
    const { data: specificProfile, error: specificError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (specificError) {
      console.error('Erreur recherche spécifique:', specificError);
    } else {
      console.log('Profil trouvé:', specificProfile);
    }

    // 4. Test provider_profiles pour cet ID
    console.log(`\n📋 4. Recherche provider_profiles pour ID: ${userId}`);
    const { data: specificProvider, error: specificProviderError } = await supabase
      .from('provider_profiles')
      .select('*')
      .eq('id', userId);
    
    if (specificProviderError) {
      console.error('Erreur provider_profiles spécifique:', specificProviderError);
    } else {
      console.log('Provider profiles trouvés:', specificProvider);
    }

    // 5. Lister quelques profils disponibles
    console.log('\n📋 5. Quelques profils disponibles:');
    const { data: someProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, business_name, avatar_url, is_provider, city')
      .limit(10);
    
    if (profilesError) {
      console.error('Erreur récupération profils:', profilesError);
    } else {
      console.log('Tous les profils disponibles:', someProfiles);
      console.log(`Nombre total de profils: ${someProfiles?.length || 0}`);
      
      // Tester avec le premier profil trouvé
      if (someProfiles && someProfiles.length > 0) {
        const firstProfile = someProfiles[0];
        console.log(`\n📋 6. Test avec profil réel ID: ${firstProfile.id}`);
        
        const { data: realProfile, error: realError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', firstProfile.id)
          .maybeSingle();
        
        if (realError) {
          console.error('Erreur profil réel:', realError);
        } else {
          console.log('✅ Données complètes du profil:', realProfile);
        }
      }
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le debug avec différents IDs
debugProfileData('tg-2').then(() => {
  console.log('\n' + '='.repeat(60));
  console.log('🎯 Debug terminé');
  process.exit(0);
});
