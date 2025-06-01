/**
 * Composant de filtre géographique pour la recherche de prestataires
 * Permet de filtrer les prestataires par pays et/ou ville
 */

import React, { useState, useEffect } from 'react';
import { Box, Button, Heading, Flex, Text, useToast } from '@chakra-ui/react';
import GeoSelector from './GeoSelector';
import { getPrestairesByPays, getPrestairesByVille } from '../../utils/api/geoApi';

/**
 * Filtre géographique pour la recherche de prestataires
 * @param {Object} props - Propriétés du composant
 * @param {Function} props.onResultsChange - Callback avec les résultats de la recherche
 * @param {boolean} props.isCollapsible - Si le filtre peut être réduit/développé
 * @returns {JSX.Element} Composant React
 */
const GeoFilter = ({ onResultsChange, isCollapsible = true, ...props }) => {
  // États locaux
  const [paysId, setPaysId] = useState(null);
  const [villeId, setVilleId] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const toast = useToast();
  
  // Fonction de recherche
  const handleSearch = async () => {
    if (!paysId && !villeId) {
      toast({
        title: "Sélection requise",
        description: "Veuillez sélectionner au moins un pays ou une ville",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setIsSearching(true);
    
    try {
      let results = [];
      
      // Priorité à la recherche par ville si disponible
      if (villeId) {
        results = await getPrestairesByVille(villeId);
      } else if (paysId) {
        results = await getPrestairesByPays(paysId);
      }
      
      // Callback avec les résultats
      if (onResultsChange) {
        onResultsChange(results);
      }
      
      // Message de confirmation
      toast({
        title: "Recherche terminée",
        description: `${results.length} prestataire(s) trouvé(s)`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Erreur lors de la recherche géographique:", error);
      toast({
        title: "Erreur de recherche",
        description: "Une erreur est survenue lors de la recherche. Veuillez réessayer.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  // Gestion du changement de pays
  const handlePaysChange = (newPaysId) => {
    setPaysId(newPaysId);
  };
  
  // Gestion du changement de ville
  const handleVilleChange = (newVilleId) => {
    setVilleId(newVilleId);
  };
  
  // Réinitialiser les filtres
  const handleReset = () => {
    setPaysId(null);
    setVilleId(null);
  };
  
  // Rendu du composant
  return (
    <Box 
      p={4} 
      borderWidth="1px" 
      borderRadius="lg" 
      boxShadow="sm"
      bg="white"
      {...props}
    >
      {/* En-tête avec option de réduction/expansion */}
      <Flex 
        justify="space-between" 
        align="center" 
        mb={isExpanded ? 4 : 0}
        cursor={isCollapsible ? "pointer" : "default"}
        onClick={() => isCollapsible && setIsExpanded(!isExpanded)}
      >
        <Heading size="md">Filtrer par localisation</Heading>
        {isCollapsible && (
          <Text fontSize="lg">{isExpanded ? '▲' : '▼'}</Text>
        )}
      </Flex>
      
      {/* Contenu du filtre */}
      {isExpanded && (
        <Box>
          <GeoSelector 
            paysId={paysId}
            villeId={villeId}
            onPaysChange={handlePaysChange}
            onVilleChange={handleVilleChange}
            labelPays="Pays"
            labelVille="Ville"
            mb={4}
          />
          
          <Flex justify="space-between" mt={4}>
            <Button 
              colorScheme="blue" 
              onClick={handleSearch}
              isLoading={isSearching}
              loadingText="Recherche..."
            >
              Rechercher
            </Button>
            <Button 
              variant="outline" 
              onClick={handleReset}
              isDisabled={!paysId && !villeId}
            >
              Réinitialiser
            </Button>
          </Flex>
        </Box>
      )}
    </Box>
  );
};

export default GeoFilter;
