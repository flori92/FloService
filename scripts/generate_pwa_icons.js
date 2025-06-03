/**
 * Script pour générer les icônes PWA à partir du logo FloService
 * Créé le 03/06/2025
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const sourceIcon = path.join(projectRoot, 'public', 'floservice.svg');
const iconsDir = path.join(projectRoot, 'public', 'icons');

// Tailles d'icônes à générer
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

/**
 * Vérifie si les dépendances nécessaires sont installées
 */
async function checkDependencies() {
  console.log('Vérification des dépendances nécessaires...');
  
  try {
    // Vérifier si sharp est installé
    execSync('npm list sharp', { stdio: 'ignore' });
    console.log('✅ sharp est déjà installé');
  } catch (error) {
    console.log('⚠️ Installation de sharp...');
    execSync('npm install --save-dev sharp', { stdio: 'inherit' });
    console.log('✅ sharp installé avec succès');
  }
}

/**
 * Crée le dossier des icônes s'il n'existe pas
 */
async function createIconsDirectory() {
  try {
    await fs.mkdir(iconsDir, { recursive: true });
    console.log(`✅ Dossier créé: ${iconsDir}`);
  } catch (error) {
    console.error(`❌ Erreur lors de la création du dossier: ${error.message}`);
    throw error;
  }
}

/**
 * Génère les icônes PWA aux différentes tailles
 */
async function generateIcons() {
  try {
    const sharp = (await import('sharp')).default;
    
    // Vérifier si le fichier source existe
    try {
      await fs.access(sourceIcon);
    } catch (error) {
      console.error(`❌ Icône source introuvable: ${sourceIcon}`);
      throw new Error(`L'icône source n'existe pas: ${sourceIcon}`);
    }
    
    // Générer les icônes pour chaque taille
    for (const size of iconSizes) {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      
      await sharp(sourceIcon)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Icône générée: ${outputPath}`);
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la génération des icônes: ${error.message}`);
    throw error;
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log('=== GÉNÉRATION DES ICÔNES PWA ===\n');
  
  try {
    // Vérifier les dépendances
    await checkDependencies();
    
    // Créer le dossier des icônes
    await createIconsDirectory();
    
    // Générer les icônes
    await generateIcons();
    
    console.log('\n✅ Génération des icônes PWA terminée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la génération des icônes PWA:', error);
    process.exit(1);
  }
}

// Exécuter la fonction principale
main().catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});
