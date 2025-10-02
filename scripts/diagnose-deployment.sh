#!/bin/bash

# Script de diagnostic complet pour FloService (Netlify + Supabase)

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "🔍 =========================================="
echo "   DIAGNOSTIC FLOSERVICE DEPLOYMENT"
echo "   =========================================="
echo ""

# 1. Vérification de l'environnement local
echo -e "${BLUE}📦 1. Environnement local${NC}"
echo "-------------------------------------------"

if [ -f package.json ]; then
    echo -e "${GREEN}✅ package.json trouvé${NC}"
    NODE_VERSION=$(node -v 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Node.js installé : $NODE_VERSION${NC}"
    else
        echo -e "${RED}❌ Node.js non installé${NC}"
    fi
    
    NPM_VERSION=$(npm -v 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ npm installé : $NPM_VERSION${NC}"
    else
        echo -e "${RED}❌ npm non installé${NC}"
    fi
else
    echo -e "${RED}❌ package.json non trouvé${NC}"
fi

# 2. Vérification des fichiers de configuration
echo ""
echo -e "${BLUE}⚙️  2. Fichiers de configuration${NC}"
echo "-------------------------------------------"

if [ -f netlify.toml ]; then
    echo -e "${GREEN}✅ netlify.toml trouvé${NC}"
else
    echo -e "${YELLOW}⚠️  netlify.toml manquant${NC}"
fi

if [ -f .env ]; then
    echo -e "${GREEN}✅ .env trouvé (local)${NC}"
    
    if grep -q "VITE_SUPABASE_URL" .env 2>/dev/null; then
        SUPABASE_URL=$(grep "VITE_SUPABASE_URL" .env | cut -d '=' -f2)
        echo -e "${GREEN}✅ VITE_SUPABASE_URL configuré${NC}"
        echo "   URL: $SUPABASE_URL"
    else
        echo -e "${RED}❌ VITE_SUPABASE_URL manquant${NC}"
    fi
    
    if grep -q "VITE_SUPABASE_ANON_KEY" .env 2>/dev/null; then
        echo -e "${GREEN}✅ VITE_SUPABASE_ANON_KEY configuré${NC}"
    else
        echo -e "${RED}❌ VITE_SUPABASE_ANON_KEY manquant${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  .env non trouvé (normal si gitignore)${NC}"
fi

# 3. Vérification de la structure du projet
echo ""
echo -e "${BLUE}📁 3. Structure du projet${NC}"
echo "-------------------------------------------"

REQUIRED_DIRS=("src" "public" "supabase" "scripts" "docs")
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✅ /$dir${NC}"
    else
        echo -e "${YELLOW}⚠️  /$dir manquant${NC}"
    fi
done

# 4. Vérification des dépendances
echo ""
echo -e "${BLUE}📚 4. Dépendances${NC}"
echo "-------------------------------------------"

if [ -d node_modules ]; then
    echo -e "${GREEN}✅ node_modules installé${NC}"
    
    # Vérifier Supabase
    if [ -d "node_modules/@supabase" ]; then
        echo -e "${GREEN}✅ @supabase/supabase-js installé${NC}"
    else
        echo -e "${RED}❌ @supabase/supabase-js manquant${NC}"
    fi
    
    # Vérifier React
    if [ -d "node_modules/react" ]; then
        echo -e "${GREEN}✅ react installé${NC}"
    else
        echo -e "${RED}❌ react manquant${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  node_modules manquant${NC}"
    echo "   Exécutez: npm install"
fi

# 5. Test de build local
echo ""
echo -e "${BLUE}🔨 5. Test de build${NC}"
echo "-------------------------------------------"

if [ -d dist ]; then
    echo -e "${GREEN}✅ Dossier dist existant${NC}"
    DIST_SIZE=$(du -sh dist 2>/dev/null | cut -f1)
    echo "   Taille: $DIST_SIZE"
else
    echo -e "${YELLOW}⚠️  Dossier dist absent${NC}"
    echo "   Exécutez: npm run build"
fi

# 6. Vérification Git
echo ""
echo -e "${BLUE}🔀 6. Statut Git${NC}"
echo "-------------------------------------------"

if [ -d .git ]; then
    echo -e "${GREEN}✅ Repository Git initialisé${NC}"
    
    BRANCH=$(git branch --show-current 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "   Branche actuelle: $BRANCH"
    fi
    
    # Vérifier les commits non poussés
    UNPUSHED=$(git log @{u}.. --oneline 2>/dev/null | wc -l)
    if [ $UNPUSHED -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $UNPUSHED commit(s) non poussé(s)${NC}"
    else
        echo -e "${GREEN}✅ Tout est synchronisé avec le remote${NC}"
    fi
    
    # Vérifier les fichiers modifiés
    MODIFIED=$(git status --porcelain 2>/dev/null | wc -l)
    if [ $MODIFIED -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $MODIFIED fichier(s) modifié(s)${NC}"
    else
        echo -e "${GREEN}✅ Aucune modification non commitée${NC}"
    fi
else
    echo -e "${RED}❌ Pas de repository Git${NC}"
fi

# 7. Connexion Supabase (test basique)
echo ""
echo -e "${BLUE}🗄️  7. Connexion Supabase${NC}"
echo "-------------------------------------------"

if [ -f .env ]; then
    SUPABASE_URL=$(grep "VITE_SUPABASE_URL" .env 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    if [ ! -z "$SUPABASE_URL" ]; then
        # Test de ping (simple HTTP request)
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/rest/v1/" 2>/dev/null)
        if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
            echo -e "${GREEN}✅ Supabase accessible (HTTP $HTTP_CODE)${NC}"
            echo "   URL: $SUPABASE_URL"
        else
            echo -e "${RED}❌ Supabase non accessible (HTTP $HTTP_CODE)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  URL Supabase non configurée${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Impossible de tester (pas de .env)${NC}"
fi

# 8. Recommandations
echo ""
echo -e "${BLUE}💡 8. Recommandations${NC}"
echo "-------------------------------------------"

ISSUES=0

if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Créer un fichier .env avec les variables Supabase${NC}"
    ((ISSUES++))
fi

if [ ! -d node_modules ]; then
    echo -e "${YELLOW}⚠️  Installer les dépendances : npm install${NC}"
    ((ISSUES++))
fi

if [ ! -d dist ]; then
    echo -e "${YELLOW}⚠️  Créer un build : npm run build${NC}"
    ((ISSUES++))
fi

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ Aucun problème détecté !${NC}"
fi

# 9. Actions à effectuer
echo ""
echo -e "${BLUE}🎯 9. Actions recommandées${NC}"
echo "-------------------------------------------"
echo ""
echo "Pour Supabase :"
echo "  1. Exécuter le script SQL : supabase/fix-rls-issues.sql"
echo "  2. Vérifier le dashboard : https://supabase.com/dashboard"
echo ""
echo "Pour Netlify :"
echo "  1. Configurer les variables d'environnement"
echo "  2. Dashboard : https://app.netlify.com/sites/floservice-fixed-0937u"
echo ""
echo "Pour le développement local :"
echo "  1. npm install (si nécessaire)"
echo "  2. npm run dev"
echo "  3. Ouvrir http://localhost:5173"
echo ""
echo -e "${BLUE}📖 Documentation complète : docs/FIX-NETLIFY-SUPABASE.md${NC}"
echo ""
echo "=========================================="
echo "   Diagnostic terminé"
echo "=========================================="
echo ""
