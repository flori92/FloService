-- Script de création des fonctions pour gérer les ID non-UUID
-- Créé le 02/06/2025

-- Création de la fonction pour gérer les ID non-UUID
CREATE OR REPLACE FUNCTION public.handle_non_uuid(id_value TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result UUID;
BEGIN
  -- Essayer de convertir directement en UUID
  BEGIN
    result := id_value::UUID;
    RETURN result;
  EXCEPTION WHEN others THEN
    -- Si échec, générer un UUID déterministe basé sur la chaîne
    RETURN md5(id_value)::UUID;
  END;
END;
$$;

-- Fonction pour vérifier si un ID est un UUID valide
CREATE OR REPLACE FUNCTION public.is_valid_uuid(id_value TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Essayer de convertir en UUID
  BEGIN
    PERFORM id_value::UUID;
    RETURN TRUE;
  EXCEPTION WHEN others THEN
    RETURN FALSE;
  END;
END;
$$;

-- Fonction pour obtenir un ID sécurisé (UUID ou transformé)
CREATE OR REPLACE FUNCTION public.get_safe_id(id_value TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF public.is_valid_uuid(id_value) THEN
    RETURN id_value::UUID;
  ELSE
    RETURN public.handle_non_uuid(id_value);
  END IF;
END;
$$;
