#!/bin/bash

# Script pour vérifier la configuration Netlify de FloService

echo "🔍 Vérification de la configuration Netlify..."
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier les variables d'environnement requises
echo "📋 Variables d'environnement requises pour Netlify :"
echo ""
echo "VITE_SUPABASE_URL=https://sxrofrdhpzpjqkplgoij.supabase.co"
echo "VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo ""

# Vérifier le fichier .env local
if [ -f .env ]; then
    echo -e "${GREEN}✅ Fichier .env trouvé localement${NC}"
    
    if grep -q "VITE_SUPABASE_URL" .env; then
        echo -e "${GREEN}✅ VITE_SUPABASE_URL configuré${NC}"
    else
        echo -e "${RED}❌ VITE_SUPABASE_URL manquant${NC}"
    fi
    
    if grep -q "VITE_SUPABASE_ANON_KEY" .env; then
        echo -e "${GREEN}✅ VITE_SUPABASE_ANON_KEY configuré${NC}"
    else
        echo -e "${RED}❌ VITE_SUPABASE_ANON_KEY manquant${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Fichier .env non trouvé (normal, .gitignore)${NC}"
fi

echo ""
echo "📝 Instructions pour configurer Netlify :"
echo ""
echo "1. Allez dans votre dashboard Netlify :"
echo "   https://app.netlify.com/sites/floservice-fixed-0937u/configuration/env"
echo ""
echo "2. Cliquez sur 'Environment variables'"
echo ""
echo "3. Ajoutez ces variables :"
echo "   - VITE_SUPABASE_URL = https://sxrofrdhpzpjqkplgoij.supabase.co"
echo "   - VITE_SUPABASE_ANON_KEY = [votre clé anonyme Supabase]"
echo ""
echo "4. Redéployez le site pour appliquer les changements"
echo ""
echo -e "${YELLOW}💡 Astuce : Vous pouvez aussi utiliser Netlify CLI${NC}"
echo "   netlify env:set VITE_SUPABASE_URL https://sxrofrdhpzpjqkplgoij.supabase.co"
echo ""
