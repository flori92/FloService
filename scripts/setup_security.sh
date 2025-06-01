#!/bin/bash

# Script d'installation et de configuration des améliorations de sécurité pour FloService
# Ce script applique toutes les modifications de sécurité recommandées
# Auteur: FloService Security Team
# Date: 01/06/2025

# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Installation des améliorations de sécurité pour FloService ===${NC}"
echo "Date d'exécution: $(date)"
echo "-----------------------------------"

# Vérification des prérequis
echo -e "\n${YELLOW}Vérification des prérequis...${NC}"

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js n'est pas installé. Veuillez l'installer avant de continuer.${NC}"
    exit 1
fi

# Vérifier si npm est installé
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm n'est pas installé. Veuillez l'installer avant de continuer.${NC}"
    exit 1
fi

# Vérifier si le fichier .env existe
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Le fichier .env n'existe pas. Création à partir de .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}Veuillez éditer le fichier .env avec vos informations d'identification.${NC}"
fi

# Installation des dépendances
echo -e "\n${YELLOW}Installation des dépendances...${NC}"
npm install dotenv @supabase/supabase-js

# Mise à jour du client Supabase
echo -e "\n${YELLOW}Mise à jour du client Supabase...${NC}"

# Vérifier si le répertoire src/lib existe
if [ ! -d "src/lib" ]; then
    echo -e "${RED}Le répertoire src/lib n'existe pas. Vérifiez la structure du projet.${NC}"
    exit 1
fi

# Sauvegarde du client Supabase existant
if [ -f "src/lib/supabase.ts" ]; then
    echo "Sauvegarde du client Supabase existant..."
    cp src/lib/supabase.ts src/lib/supabase.ts.bak
    echo -e "${GREEN}Sauvegarde effectuée: src/lib/supabase.ts.bak${NC}"
fi

# Copie du nouveau client sécurisé
echo "Installation du client Supabase sécurisé..."
cp src/lib/supabase-secure.ts src/lib/supabase.ts
echo -e "${GREEN}Client Supabase sécurisé installé avec succès!${NC}"

# Vérification de la configuration Supabase
echo -e "\n${YELLOW}Vérification de la configuration Supabase...${NC}"

# Extraire l'URL Supabase et la clé anonyme du fichier .env
SUPABASE_URL=$(grep VITE_SUPABASE_URL .env | cut -d '=' -f2)
SUPABASE_ANON_KEY=$(grep VITE_SUPABASE_ANON_KEY .env | cut -d '=' -f2)

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}Les variables d'environnement Supabase sont manquantes dans le fichier .env.${NC}"
    echo -e "${YELLOW}Veuillez compléter les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.${NC}"
else
    echo -e "${GREEN}Configuration Supabase détectée.${NC}"
fi

# Vérification des variables Expo
EXPO_SUPABASE_URL=$(grep EXPO_PUBLIC_SUPABASE_URL .env | cut -d '=' -f2)
EXPO_SUPABASE_ANON_KEY=$(grep EXPO_PUBLIC_SUPABASE_ANON_KEY .env | cut -d '=' -f2)

if [ -z "$EXPO_SUPABASE_URL" ] || [ -z "$EXPO_SUPABASE_ANON_KEY" ]; then
    echo -e "${YELLOW}Les variables d'environnement Expo sont manquantes dans le fichier .env.${NC}"
    echo -e "${YELLOW}Ajout des variables Expo basées sur les variables VITE...${NC}"
    
    # Ajouter les variables Expo au fichier .env
    echo "" >> .env
    echo "# Variables pour Expo" >> .env
    echo "EXPO_PUBLIC_SUPABASE_URL=$SUPABASE_URL" >> .env
    echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY" >> .env
    
    echo -e "${GREEN}Variables Expo ajoutées au fichier .env.${NC}"
else
    echo -e "${GREEN}Variables Expo détectées.${NC}"
fi

# Instructions pour l'application des scripts SQL
echo -e "\n${YELLOW}Instructions pour l'application des scripts SQL:${NC}"
echo "1. Connectez-vous à votre projet Supabase (https://app.supabase.io)"
echo "2. Allez dans l'onglet 'SQL Editor'"
echo "3. Copiez le contenu du fichier 'supabase/security_fixes.sql'"
echo "4. Collez-le dans l'éditeur SQL et exécutez-le"
echo -e "${RED}ATTENTION: Faites une sauvegarde de votre base de données avant d'exécuter ce script!${NC}"

# Test de sécurité
echo -e "\n${YELLOW}Voulez-vous exécuter le test de sécurité maintenant? (o/n)${NC}"
read -r response
if [[ "$response" =~ ^([oO][uU][iI]|[oO])$ ]]; then
    echo -e "\n${YELLOW}Exécution du test de sécurité...${NC}"
    node scripts/test_security.js
else
    echo -e "\n${YELLOW}Vous pouvez exécuter le test de sécurité plus tard avec la commande:${NC}"
    echo "node scripts/test_security.js"
fi

echo -e "\n${GREEN}=== Installation terminée ===${NC}"
echo "Consultez le fichier SECURITY_GUIDE.md pour plus d'informations sur les améliorations de sécurité."
echo "-----------------------------------"
