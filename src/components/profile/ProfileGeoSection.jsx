/**
 * Section géographique du profil utilisateur
 * Permet à l'utilisateur de définir sa localisation (pays/ville)
 * À intégrer dans les pages de profil ou d'inscription
 */

import React, { useState, useEffect } from 'react';
import { Box, Button, Heading, Text, useToast } from '@chakra-ui/react';
import { useAuth } from '../../contexts/AuthContext';
import GeoSelector from '../geo/GeoSelector';
import { getUserGeoInfo, updateUserVille } from '../../utils/api/geoApi';

/**
 * Section de profil pour la gestion de la localisation
 */
const ProfileGeoSection = () => {
  // Contexte et états
  const { user } = useAuth();
  const [paysId, setPaysId] = useState(null);
  const [villeId, setVilleId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();
  
  // Charger les données géographiques de l'utilisateur au démarrage
  useEffect(() => {
    const loadUserGeoInfo = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const geoInfo = await getUserGeoInfo(user.id);
        setPaysId(geoInfo.paysId);
        setVilleId(geoInfo.villeId);
      } catch (error) {
        console.error('Erreur lors du chargement des données géographiques:', error);
        toast({
          title: "Erreur de chargement",
          description: "Impossible de charger vos informations de localisation",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserGeoInfo();
  }, [user]);
  
  // Gestionnaires d'événements
  const handlePaysChange = (newPaysId) => {
    setPaysId(newPaysId);
  };
  
  const handleVilleChange = (newVilleId) => {
    setVilleId(newVilleId);
  };
  
  // Enregistrer les modifications
  const handleSave = async () => {
    if (!user || !villeId) {
      toast({
        title: "Données incomplètes",
        description: "Veuillez sélectionner un pays et une ville",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setIsSaving(true);
    try {
      const success = await updateUserVille(user.id, villeId);
      
      if (success) {
        toast({
          title: "Localisation mise à jour",
          description: "Vos informations de localisation ont été enregistrées",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error("Échec de la mise à jour");
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la localisation:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible d'enregistrer vos informations de localisation",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Rendu du composant
  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" boxShadow="sm" bg="white" mb={4}>
      <Heading size="md" mb={4}>Votre localisation</Heading>
      
      <Text mb={4} color="gray.600">
        Ces informations nous permettent de vous connecter avec des prestataires et clients dans votre région.
      </Text>
      
      <GeoSelector
        paysId={paysId}
        villeId={villeId}
        onPaysChange={handlePaysChange}
        onVilleChange={handleVilleChange}
        isRequired={true}
        labelPays="Votre pays"
        labelVille="Votre ville"
        isDisabled={isLoading}
        mb={4}
      />
      
      <Button
        colorScheme="blue"
        onClick={handleSave}
        isLoading={isSaving}
        loadingText="Enregistrement..."
        isDisabled={!villeId || isLoading}
        mt={2}
      >
        Enregistrer ma localisation
      </Button>
    </Box>
  );
};

export default ProfileGeoSection;
