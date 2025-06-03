/**
 * Script pour télécharger les polices Google Fonts et les stocker localement
 * Créé le 03/06/2025
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);

// Obtenir le chemin du répertoire actuel en mode ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Polices à télécharger
const FONTS = [
  {
    name: 'inter-regular',
    url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2',
    weight: 400
  },
  {
    name: 'inter-medium',
    url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hjp-Ek-_EeA.woff2',
    weight: 500
  },
  {
    name: 'inter-semibold',
    url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hjp-Ek-_EeA.woff2',
    weight: 600
  },
  {
    name: 'inter-bold',
    url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hjp-Ek-_EeA.woff2',
    weight: 700
  }
];

// Fonction pour télécharger un fichier
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`Téléchargement de ${url} vers ${outputPath}...`);
    
    const file = fs.createWriteStream(outputPath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Échec du téléchargement: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Téléchargement terminé: ${outputPath}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {}); // Suppression du fichier en cas d'erreur
      reject(err);
    });
    
    file.on('error', (err) => {
      fs.unlink(outputPath, () => {}); // Suppression du fichier en cas d'erreur
      reject(err);
    });
  });
}

// Fonction principale
async function main() {
  try {
    const fontsDir = path.join(__dirname, '..', 'public', 'fonts');
    
    // Création du dossier fonts s'il n'existe pas
    if (!fs.existsSync(fontsDir)) {
      console.log(`Création du dossier ${fontsDir}...`);
      await mkdir(fontsDir, { recursive: true });
    }
    
    // Téléchargement des polices
    const downloadPromises = FONTS.map(font => {
      const outputPath = path.join(fontsDir, `${font.name}.woff2`);
      return downloadFile(font.url, outputPath);
    });
    
    await Promise.all(downloadPromises);
    
    console.log('Tous les téléchargements sont terminés !');
  } catch (error) {
    console.error('Erreur lors du téléchargement des polices:', error);
    process.exit(1);
  }
}

// Exécution de la fonction principale
main();
