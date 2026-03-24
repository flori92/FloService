/**
 * Composant de recherche par proximité
 * Permet de filtrer les prestataires dans un rayon autour d'une ville
 * Créé le 01/06/2025
 */

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Heading, 
  Text, 
  Flex, 
  Slider, 
  SliderTrack, 
  SliderFilledTrack, 
  SliderThumb, 
  Badge,
  useToast 
} from '@chakra-ui/react';
import GeoSelector from './GeoSelector';
import { 
  getPrestairesByProximity, 
  getVillesByProximity 
} from '../../utils/api/geoApi';

/**
 * Filtre de recherche avec option de rayon de proximité
 * @param {Object} props - Propriétés du composant
 * @param {Function} props.onResultsChange - Callback avec les résultats de la recherche
 * @param {Function} props.onNearbyVillesChange - Callback avec les villes à proximité
 * @param {boolean} props.isCollapsible - Si le filtre peut être réduit/développé
 * @returns {JSX.Element} Composant React
 */
const ProximitySearchFilter = ({ 
  onResultsChange, 
  onNearbyVillesChange,
  isCollapsible = true, 
  ...props 
}) => {
  // États locaux
  const [paysId, setPaysId] = useState(null);
  const [villeId, setVilleId] = useState(null);
  const [rayonKm, setRayonKm] = useState(50); // 50km par défaut
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [nearbyVilles, setNearbyVilles] = useState([]);
  const toast = useToast();
  
  // Effet pour charger les villes à proximité quand la ville change
  useEffect(() => {
    const fetchNearbyVilles = async () => {
      if (!villeId) {
        setNearbyVilles([]);
        return;
      }
      
      try {
        const villes = await getVillesByProximity(villeId, rayonKm);
        setNearbyVilles(villes);
        
        if (onNearbyVillesChange) {
          onNearbyVillesChange(villes);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des villes à proximité:', error);
      }
    };
    
    fetchNearbyVilles();
  }, [villeId, rayonKm]);
  
  // Fonction de recherche
  const handleSearch = async () => {
    if (!villeId) {
      toast({
        title: "Ville requise",
        description: "Veuillez sélectionner une ville pour la recherche par proximité",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setIsSearching(true);
    
    try {
      const results = await getPrestairesByProximity(villeId, rayonKm);
      
      // Callback avec les résultats
      if (onResultsChange) {
        onResultsChange(results);
      }
      
      // Message de confirmation
      toast({
        title: "Recherche terminée",
        description: `${results.length} prestataire(s) trouvé(s) dans un rayon de ${rayonKm}km`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Erreur lors de la recherche par proximité:", error);
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
    setRayonKm(50);
  };
  
  // Formater l'affichage du rayon
  const formatRayon = (val) => `${val} km`;
  
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
        <Heading size="md">Recherche par proximité</Heading>
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
            labelVille="Ville de référence"
            mb={4}
          />
          
          {/* Slider pour le rayon de recherche */}
          {villeId && (
            <Box mt={6} mb={6}>
              <Flex justify="space-between" mb={2}>
                <Text fontWeight="medium">Rayon de recherche</Text>
                <Badge colorScheme="blue" fontSize="0.9em" p={1}>
                  {formatRayon(rayonKm)}
                </Badge>
              </Flex>
              <Slider
                defaultValue={50}
                min={10}
                max={200}
                step={10}
                value={rayonKm}
                onChange={(val) => setRayonKm(val)}
                colorScheme="blue"
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb boxSize={6} />
              </Slider>
              
              {/* Villes à proximité */}
              {nearbyVilles.length > 0 && (
                <Box mt={4}>
                  <Text fontWeight="medium" mb={2}>
                    {nearbyVilles.length} villes dans un rayon de {rayonKm}km:
                  </Text>
                  <Flex flexWrap="wrap" gap={2}>
                    {nearbyVilles.slice(0, 10).map((ville) => (
                      <Badge key={ville.id} colorScheme="gray" px={2} py={1}>
                        {ville.nom} ({Math.round(ville.distance)}km)
                      </Badge>
                    ))}
                    {nearbyVilles.length > 10 && (
                      <Badge colorScheme="gray" px={2} py={1}>
                        +{nearbyVilles.length - 10} autres
                      </Badge>
                    )}
                  </Flex>
                </Box>
              )}
            </Box>
          )}
          
          <Flex justify="space-between" mt={4}>
            <Button 
              colorScheme="blue" 
              onClick={handleSearch}
              isLoading={isSearching}
              loadingText="Recherche..."
              isDisabled={!villeId}
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

export default ProximitySearchFilter;
