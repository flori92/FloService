/**
 * Composant de sélection géographique (pays et villes)
 * Utilisable dans les formulaires d'inscription, profil et filtres de recherche
 */

import React, { useState, useEffect } from 'react';
import { getAllPays, getVillesByPays } from '../../utils/api/geoApi';
import { Box, FormControl, FormLabel, Select, Skeleton, Stack } from '@chakra-ui/react';

/**
 * Sélecteur géographique pour choisir un pays puis une ville
 * @param {Object} props - Propriétés du composant
 * @param {number} props.paysId - ID du pays sélectionné (optionnel)
 * @param {number} props.villeId - ID de la ville sélectionnée (optionnel)
 * @param {Function} props.onPaysChange - Callback quand le pays change
 * @param {Function} props.onVilleChange - Callback quand la ville change
 * @param {boolean} props.isRequired - Si les champs sont requis
 * @param {string} props.labelPays - Libellé pour le champ pays
 * @param {string} props.labelVille - Libellé pour le champ ville
 * @returns {JSX.Element} Composant React
 */
const GeoSelector = ({
  paysId = null,
  villeId = null,
  onPaysChange,
  onVilleChange,
  isRequired = false,
  labelPays = "Pays",
  labelVille = "Ville",
  ...props
}) => {
  // États locaux
  const [pays, setPays] = useState([]);
  const [villes, setVilles] = useState([]);
  const [selectedPaysId, setSelectedPaysId] = useState(paysId);
  const [selectedVilleId, setSelectedVilleId] = useState(villeId);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVilles, setIsLoadingVilles] = useState(false);
  
  // Charger tous les pays au chargement du composant
  useEffect(() => {
    const fetchPays = async () => {
      setIsLoading(true);
      const data = await getAllPays();
      setPays(data);
      setIsLoading(false);
    };
    
    fetchPays();
  }, []);
  
  // Charger les villes quand le pays change
  useEffect(() => {
    const fetchVilles = async () => {
      if (!selectedPaysId) {
        setVilles([]);
        return;
      }
      
      setIsLoadingVilles(true);
      const data = await getVillesByPays(selectedPaysId);
      setVilles(data);
      setIsLoadingVilles(false);
    };
    
    fetchVilles();
  }, [selectedPaysId]);
  
  // Gestion du changement de pays
  const handlePaysChange = (e) => {
    const newPaysId = e.target.value ? parseInt(e.target.value) : null;
    setSelectedPaysId(newPaysId);
    setSelectedVilleId(null); // Réinitialiser la ville
    
    if (onPaysChange) {
      onPaysChange(newPaysId);
    }
    
    if (onVilleChange) {
      onVilleChange(null);
    }
  };
  
  // Gestion du changement de ville
  const handleVilleChange = (e) => {
    const newVilleId = e.target.value ? parseInt(e.target.value) : null;
    setSelectedVilleId(newVilleId);
    
    if (onVilleChange) {
      onVilleChange(newVilleId);
    }
  };
  
  // Rendu du composant
  return (
    <Stack spacing={4} {...props}>
      {isLoading ? (
        <Skeleton height="60px" />
      ) : (
        <FormControl isRequired={isRequired}>
          <FormLabel>{labelPays}</FormLabel>
          <Select 
            placeholder="Sélectionnez un pays"
            value={selectedPaysId || ''}
            onChange={handlePaysChange}
          >
            {pays.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </Select>
        </FormControl>
      )}
      
      {selectedPaysId && (
        <FormControl isRequired={isRequired}>
          <FormLabel>{labelVille}</FormLabel>
          {isLoadingVilles ? (
            <Skeleton height="40px" />
          ) : (
            <Select
              placeholder="Sélectionnez une ville"
              value={selectedVilleId || ''}
              onChange={handleVilleChange}
              isDisabled={villes.length === 0}
            >
              {villes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nom}
                </option>
              ))}
            </Select>
          )}
        </FormControl>
      )}
    </Stack>
  );
};

export default GeoSelector;
