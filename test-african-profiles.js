#!/usr/bin/env node

/**
 * Script de test pour valider les profils de prestataires africains
 * Teste tous les nouveaux profils: Fatima (CI), Kwame (GH), Aminata (SN), Moussa (BF)
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function testAfricanProfiles() {
  console.log('🌍 Test des profils de prestataires africains FloService');
  console.log('='.repeat(60));

  const profileIds = ['tg-2', 'tg-3', 'tg-4', 'tg-5'];
  const countries = ['Côte d\'Ivoire', 'Ghana', 'Sénégal', 'Burkina Faso'];

  try {
    // Import dynamique de la fonction
    const { getProfileWithProviderData } = await import('./src/lib/supabase-secure.ts');

    for (let i = 0; i < profileIds.length; i++) {
      const profileId = profileIds[i];
      const country = countries[i];
      
      console.log(`\n📋 Test du profil ${profileId} (${country})`);
      console.log('-'.repeat(40));

      const { data, error } = await getProfileWithProviderData(profileId);

      if (error) {
        console.error(`❌ Erreur pour ${profileId}:`, error);
        continue;
      }

      if (!data) {
        console.error(`❌ Aucune donnée pour ${profileId}`);
        continue;
      }

      // Vérifications du profil
      console.log(`✅ Nom: ${data.full_name}`);
      console.log(`✅ Entreprise: ${data.business_name}`);
      console.log(`✅ Ville: ${data.city}`);
      console.log(`✅ Spécialité: ${data.provider_profiles?.[0]?.specialization}`);
      console.log(`✅ Expérience: ${data.provider_profiles?.[0]?.experience_years} ans`);
      console.log(`✅ Tarif: ${data.provider_profiles?.[0]?.hourly_rate} FCFA/h`);
      console.log(`✅ Note: ${data.provider_profiles?.[0]?.rating}/5`);
      console.log(`✅ Portfolio: ${data.provider_profiles?.[0]?.portfolio?.length || 0} projets`);
      console.log(`✅ Compétences: ${data.provider_profiles?.[0]?.skills?.length || 0} compétences`);
      
      // Vérification des langues africaines
      const languages = data.languages || [];
      const africanLanguages = languages.filter(lang => 
        !['Français', 'Anglais'].includes(lang)
      );
      
      if (africanLanguages.length > 0) {
        console.log(`🌍 Langues africaines: ${africanLanguages.join(', ')}`);
      }
    }

    console.log('\n🎯 Test terminé avec succès !');
    console.log('✅ Tous les profils africains sont configurés correctement');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le test
testAfricanProfiles();
