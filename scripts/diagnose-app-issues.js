#!/usr/bin/env node

/**
 * Script de diagnostic pour identifier et corriger les problèmes d'application
 * Résout les erreurs Service Worker, Supabase et autres problèmes détectés
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

console.log('🔍 Diagnostic des problèmes de l\'application FloService...\n');

// 1. Vérifier la configuration du Service Worker
function checkServiceWorkerConfig() {
  console.log('📋 1. Vérification de la configuration du Service Worker');
  
  const swPath = path.join(PUBLIC_DIR, 'noop-sw.js');
  const indexPath = path.join(PROJECT_ROOT, 'index.html');
  
  try {
    // Vérifier l'existence du fichier SW
    if (!fs.existsSync(swPath)) {
      console.log('❌ Fichier Service Worker manquant');
      return false;
    }
    
    const swContent = fs.readFileSync(swPath, 'utf8');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Vérifications
    const hasProperEventListeners = swContent.includes('addEventListener(\'install\'') && 
                                   swContent.includes('addEventListener(\'activate\'');
    const hasIntelligentRegistration = indexContent.includes('getRegistrations()') &&
                                      indexContent.includes('existingRegistration');
    const hasVersionInfo = swContent.includes('v1.1.0') || swContent.includes('FloService');
    
    console.log(`   📁 Fichier SW existe: ✅`);
    console.log(`   🎧 Event listeners: ${hasProperEventListeners ? '✅' : '❌'}`);
    console.log(`   🧠 Enregistrement intelligent: ${hasIntelligentRegistration ? '✅' : '❌'}`);
    console.log(`   🏷️  Information de version: ${hasVersionInfo ? '✅' : '❌'}`);
    
    return hasProperEventListeners && hasIntelligentRegistration && hasVersionInfo;
    
  } catch (error) {
    console.log('❌ Erreur lors de la vérification SW:', error.message);
    return false;
  }
}

// 2. Vérifier la configuration Supabase
function checkSupabaseConfig() {
  console.log('\n📋 2. Vérification de la configuration Supabase');
  
  const supabaseSecurePath = path.join(SRC_DIR, 'lib', 'supabase-secure.ts');
  const profileHandlerPath = path.join(SRC_DIR, 'utils', 'profile-handler.ts');
  
  try {
    if (!fs.existsSync(supabaseSecurePath)) {
      console.log('❌ Fichier supabase-secure.ts manquant');
      return false;
    }
    
    const supabaseContent = fs.readFileSync(supabaseSecurePath, 'utf8');
    
    // Vérifications
    const hasProfileHandler = fs.existsSync(profileHandlerPath);
    const hasFallbackClient = supabaseContent.includes('createFallbackClient');
    const hasErrorHandling = supabaseContent.includes('getProfileWithProviderData');
    const hasValidation = supabaseContent.includes('validateUserId');
    
    console.log(`   🛡️  Gestionnaire de profils: ${hasProfileHandler ? '✅' : '❌'}`);
    console.log(`   🔄 Client de secours: ${hasFallbackClient ? '✅' : '❌'}`);
    console.log(`   ⚠️  Gestion d'erreurs: ${hasErrorHandling ? '✅' : '❌'}`);
    console.log(`   ✅ Validation d'ID: ${hasValidation ? '✅' : '❌'}`);
    
    return hasProfileHandler && hasFallbackClient && hasErrorHandling && hasValidation;
    
  } catch (error) {
    console.log('❌ Erreur lors de la vérification Supabase:', error.message);
    return false;
  }
}

// 3. Vérifier la configuration CSP et cookies
function checkSecurityConfig() {
  console.log('\n📋 3. Vérification de la configuration de sécurité');
  
  const indexPath = path.join(PROJECT_ROOT, 'index.html');
  
  try {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Vérifications CSP
    const hasCSP = indexContent.includes('Content-Security-Policy');
    const hasSupabaseInCSP = indexContent.includes('*.supabase.co');
    const hasCookieConfig = indexContent.includes('SameSite=None; Secure');
    const hasHTTPSCheck = indexContent.includes('location.protocol === \'https:\'');
    
    console.log(`   🛡️  Politique CSP: ${hasCSP ? '✅' : '❌'}`);
    console.log(`   🗄️  Supabase dans CSP: ${hasSupabaseInCSP ? '✅' : '❌'}`);
    console.log(`   🍪 Configuration cookies: ${hasCookieConfig ? '✅' : '❌'}`);
    console.log(`   🔒 Vérification HTTPS: ${hasHTTPSCheck ? '✅' : '❌'}`);
    
    return hasCSP && hasSupabaseInCSP && hasCookieConfig && hasHTTPSCheck;
    
  } catch (error) {
    console.log('❌ Erreur lors de la vérification sécurité:', error.message);
    return false;
  }
}

// 4. Test de la connectivité Supabase
async function testSupabaseConnectivity() {
  console.log('\n📋 4. Test de connectivité Supabase');
  
  try {
    // Configuration depuis les variables d'environnement ou valeurs par défaut
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sxrofrdhpzpjqkplgoij.supabase.co';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cm9mcmRocHpwanFrcGxnb2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNjY2NzksImV4cCI6MjA2Mzc0MjY3OX0.ddLsIbp814amozono-gIhjNPWYE4Lgo20dJmG3Q-Cww';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test de connectivité de base
    console.log('   🔗 Test de connectivité...');
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    
    if (error) {
      console.log(`   ❌ Erreur de connectivité: ${error.message}`);
      return false;
    }
    
    console.log('   ✅ Connectivité Supabase OK');
    
    // Test spécifique pour l'ID tg-2
    console.log('   🧪 Test requête ID tg-2...');
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', 'tg-2')
      .maybeSingle();
    
    if (testError && testError.code !== 'PGRST116') {
      console.log(`   ⚠️  Erreur pour ID tg-2: ${testError.message}`);
    } else {
      console.log('   ✅ Requête ID tg-2 gérée correctement');
    }
    
    return true;
    
  } catch (error) {
    console.log(`   ❌ Erreur de test: ${error.message}`);
    return false;
  }
}

// 5. Rapport final et recommandations
function generateReport(results) {
  console.log('\n📊 RAPPORT DE DIAGNOSTIC\n');
  
  const allPassed = results.every(result => result.passed);
  
  console.log(`État général: ${allPassed ? '✅ TOUS LES TESTS PASSÉS' : '❌ PROBLÈMES DÉTECTÉS'}\n`);
  
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.name}: ${result.passed ? '✅' : '❌'}`);
    if (!result.passed && result.recommendations) {
      result.recommendations.forEach(rec => {
        console.log(`   💡 ${rec}`);
      });
    }
  });
  
  if (!allPassed) {
    console.log('\n🔧 ACTIONS RECOMMANDÉES:');
    console.log('1. Exécuter: npm run build pour vérifier la compilation');
    console.log('2. Vérifier les logs du navigateur pour d\'autres erreurs');
    console.log('3. Tester l\'application en mode incognito');
    console.log('4. Vider le cache du navigateur et des Service Workers');
  } else {
    console.log('\n🎉 Toutes les vérifications sont passées ! L\'application devrait fonctionner correctement.');
  }
}

// Exécution principale
async function main() {
  const results = [
    {
      name: 'Configuration Service Worker',
      passed: checkServiceWorkerConfig(),
      recommendations: [
        'Vérifier le fichier /public/noop-sw.js',
        'Mettre à jour la logique d\'enregistrement dans index.html'
      ]
    },
    {
      name: 'Configuration Supabase',
      passed: checkSupabaseConfig(),
      recommendations: [
        'Vérifier le fichier /src/lib/supabase-secure.ts',
        'Créer le gestionnaire de profils /src/utils/profile-handler.ts'
      ]
    },
    {
      name: 'Configuration Sécurité',
      passed: checkSecurityConfig(),
      recommendations: [
        'Mettre à jour les directives CSP dans index.html',
        'Ajouter la gestion des cookies sécurisés'
      ]
    },
    {
      name: 'Connectivité Supabase',
      passed: await testSupabaseConnectivity(),
      recommendations: [
        'Vérifier les variables d\'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY',
        'Contrôler les règles RLS dans Supabase'
      ]
    }
  ];
  
  generateReport(results);
}

// Exécuter le diagnostic
main().catch(error => {
  console.error('❌ Erreur critique lors du diagnostic:', error);
  process.exit(1);
});
