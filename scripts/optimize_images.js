/**
 * Script pour optimiser les images du projet
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
const publicDir = path.join(projectRoot, 'public');
const assetsDir = path.join(projectRoot, 'src', 'assets');

// Création du dossier assets s'il n'existe pas
try {
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
    console.log(`✅ Dossier créé: ${assetsDir}`);
  }
} catch (error) {
  console.error(`❌ Erreur lors de la création du dossier assets: ${error.message}`);
}

// Extensions d'images à optimiser
const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];

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
  
  try {
    // Vérifier si imagemin est installé
    execSync('npm list imagemin imagemin-mozjpeg imagemin-pngquant', { stdio: 'ignore' });
    console.log('✅ imagemin est déjà installé');
  } catch (error) {
    console.log('⚠️ Installation d\'imagemin et ses plugins...');
    execSync('npm install --save-dev imagemin imagemin-mozjpeg imagemin-pngquant', { stdio: 'inherit' });
    console.log('✅ imagemin installé avec succès');
  }
}

/**
 * Trouve récursivement toutes les images dans un répertoire
 * @param {string} dir - Répertoire à parcourir
 * @returns {Promise<string[]>} - Liste des chemins d'images
 */
async function findImages(dir) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  let images = [];
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      const nestedImages = await findImages(fullPath);
      images = [...images, ...nestedImages];
    } else {
      const ext = path.extname(file.name).toLowerCase();
      if (imageExtensions.includes(ext)) {
        images.push(fullPath);
      }
    }
  }
  
  return images;
}

/**
 * Optimise une image avec sharp
 * @param {string} imagePath - Chemin de l'image à optimiser
 */
async function optimizeImage(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const outputPath = imagePath; // Remplacer l'original
  
  try {
    // Utiliser différentes stratégies selon le type d'image
    if (ext === '.svg') {
      // Pour les SVG, utiliser svgo via execSync
      execSync(`npx svgo "${imagePath}" -o "${outputPath}"`, { stdio: 'ignore' });
    } else {
      // Pour les autres formats, utiliser sharp
      const sharp = (await import('sharp')).default;
      const imagemin = (await import('imagemin')).default;
      const imageminMozjpeg = (await import('imagemin-mozjpeg')).default;
      const imageminPngquant = (await import('imagemin-pngquant')).default;
      
      // Lire l'image
      const imageBuffer = await fs.readFile(imagePath);
      
      // Traiter selon le type
      let optimizedBuffer;
      
      if (ext === '.jpg' || ext === '.jpeg') {
        // Optimiser les JPEG
        optimizedBuffer = await imagemin.buffer(imageBuffer, {
          plugins: [imageminMozjpeg({ quality: 80 })]
        });
      } else if (ext === '.png') {
        // Optimiser les PNG
        optimizedBuffer = await imagemin.buffer(imageBuffer, {
          plugins: [imageminPngquant({ quality: [0.65, 0.8] })]
        });
      } else if (ext === '.webp') {
        // Optimiser les WebP
        optimizedBuffer = await sharp(imageBuffer)
          .webp({ quality: 80 })
          .toBuffer();
      } else {
        // Format non pris en charge
        console.log(`⚠️ Format non pris en charge: ${imagePath}`);
        return;
      }
      
      // Écrire l'image optimisée
      await fs.writeFile(outputPath, optimizedBuffer);
    }
    
    console.log(`✅ Image optimisée: ${imagePath}`);
  } catch (error) {
    console.error(`❌ Erreur lors de l'optimisation de ${imagePath}:`, error.message);
  }
}

/**
 * Convertit les images en format WebP
 * @param {string} imagePath - Chemin de l'image à convertir
 */
async function convertToWebP(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  
  // Ne pas convertir les SVG ou les WebP existants
  if (ext === '.svg' || ext === '.webp') {
    return;
  }
  
  const webpPath = imagePath.replace(ext, '.webp');
  
  try {
    const sharp = (await import('sharp')).default;
    
    // Convertir en WebP
    await sharp(imagePath)
      .webp({ quality: 80 })
      .toFile(webpPath);
    
    console.log(`✅ Image convertie en WebP: ${webpPath}`);
  } catch (error) {
    console.error(`❌ Erreur lors de la conversion en WebP de ${imagePath}:`, error.message);
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log('=== OPTIMISATION DES IMAGES ===\n');
  
  try {
    // Vérifier les dépendances
    await checkDependencies();
    
    // Trouver toutes les images
    console.log('\nRecherche des images...');
    const publicImages = await findImages(publicDir);
    const assetsImages = await findImages(assetsDir);
    const allImages = [...publicImages, ...assetsImages];
    
    console.log(`Trouvé ${allImages.length} images à optimiser\n`);
    
    // Optimiser chaque image
    console.log('Optimisation des images...');
    for (const imagePath of allImages) {
      await optimizeImage(imagePath);
    }
    
    // Convertir en WebP (en plus du format original)
    console.log('\nConversion des images en WebP...');
    for (const imagePath of allImages) {
      await convertToWebP(imagePath);
    }
    
    console.log('\n✅ Optimisation des images terminée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'optimisation des images:', error);
  }
}

// Exécuter la fonction principale
main().catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});
