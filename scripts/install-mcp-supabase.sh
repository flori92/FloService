#!/bin/bash

# Script d'installation automatique du serveur MCP Supabase pour Windsurf

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}🚀 Installation du serveur MCP Supabase${NC}"
echo "=========================================="
echo ""

# Configuration
MCP_CONFIG_DIR="$HOME/.codeium/windsurf"
MCP_CONFIG_FILE="$MCP_CONFIG_DIR/mcp_config.json"
SUPABASE_MCP_URL="https://mcp.supabase.com/mcp?project_ref=sxrofrdhpzpjqkplgoij&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cstorage"

# Configuration JSON pour Supabase
SUPABASE_CONFIG='{
  "command": "npx",
  "args": [
    "-y",
    "mcp-remote",
    "https://mcp.supabase.com/mcp?project_ref=sxrofrdhpzpjqkplgoij&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cstorage"
  ]
}'

# 1. Vérifier si le répertoire existe
echo -e "${YELLOW}📁 Vérification du répertoire MCP...${NC}"
if [ ! -d "$MCP_CONFIG_DIR" ]; then
    echo -e "${YELLOW}⚠️  Création du répertoire $MCP_CONFIG_DIR${NC}"
    mkdir -p "$MCP_CONFIG_DIR"
fi

# 2. Sauvegarder l'ancienne configuration si elle existe
if [ -f "$MCP_CONFIG_FILE" ]; then
    BACKUP_FILE="$MCP_CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${YELLOW}📦 Sauvegarde de l'ancienne configuration...${NC}"
    cp "$MCP_CONFIG_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✅ Sauvegarde créée : $BACKUP_FILE${NC}"
fi

# 3. Créer ou mettre à jour la configuration
echo -e "${YELLOW}⚙️  Configuration du serveur MCP Supabase...${NC}"

if [ ! -f "$MCP_CONFIG_FILE" ]; then
    # Créer un nouveau fichier
    echo -e "${YELLOW}📝 Création d'un nouveau fichier de configuration...${NC}"
    cat > "$MCP_CONFIG_FILE" << 'EOF'
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.supabase.com/mcp?project_ref=sxrofrdhpzpjqkplgoij&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cstorage"
      ]
    }
  }
}
EOF
    echo -e "${GREEN}✅ Fichier de configuration créé${NC}"
else
    # Mettre à jour le fichier existant
    echo -e "${YELLOW}📝 Mise à jour de la configuration existante...${NC}"
    
    # Vérifier si Node.js et jq sont installés pour manipuler le JSON
    if command -v node &> /dev/null; then
        # Utiliser Node.js pour manipuler le JSON
        node << 'NODESCRIPT'
const fs = require('fs');
const configPath = process.env.MCP_CONFIG_FILE;
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (!config.mcpServers) {
  config.mcpServers = {};
}

config.mcpServers.supabase = {
  command: "npx",
  args: [
    "-y",
    "mcp-remote",
    "https://mcp.supabase.com/mcp?project_ref=sxrofrdhpzpjqkplgoij&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cstorage"
  ]
};

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('✅ Configuration mise à jour avec succès');
NODESCRIPT
    else
        echo -e "${RED}❌ Node.js non trouvé. Impossible de mettre à jour automatiquement.${NC}"
        echo -e "${YELLOW}💡 Ajoutez manuellement cette configuration à $MCP_CONFIG_FILE :${NC}"
        echo ""
        echo "$SUPABASE_CONFIG"
        echo ""
        exit 1
    fi
fi

# 4. Afficher la configuration finale
echo ""
echo -e "${GREEN}✅ Configuration installée avec succès !${NC}"
echo ""
echo -e "${BLUE}📋 Contenu de la configuration :${NC}"
cat "$MCP_CONFIG_FILE"
echo ""

# 5. Instructions finales
echo -e "${BLUE}📝 Prochaines étapes :${NC}"
echo ""
echo "1. ${YELLOW}Redémarrez Windsurf complètement${NC}"
echo "   - Fermez toutes les fenêtres Windsurf"
echo "   - Relancez Windsurf"
echo ""
echo "2. ${GREEN}Vérifiez que le serveur MCP Supabase est actif${NC}"
echo "   - Le serveur devrait apparaître dans la liste MCP"
echo ""
echo "3. ${GREEN}Testez la connexion${NC}"
echo "   - Demandez à Cascade d'exécuter une requête SQL"
echo "   - Exemple : 'Liste toutes les tables de ma base Supabase'"
echo ""
echo "4. ${GREEN}Résolvez les problèmes RLS${NC}"
echo "   - Demandez : 'Exécute le script supabase/fix-rls-issues.sql'"
echo ""
echo -e "${BLUE}📖 Documentation complète : docs/SETUP-MCP-SUPABASE.md${NC}"
echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Installation terminée !${NC}"
echo "=========================================="
echo ""
