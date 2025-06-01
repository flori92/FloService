-- Script de correction manuelle des fonctions problématiques
-- Généré automatiquement le 2025-06-01T09:52:42.469Z

-- ERREUR lors de la correction de la fonction find_nearby_providers: syntax error at or near "DEFAULT"
-- ÉCHEC de la correction via ALTER FUNCTION pour find_nearby_providers: syntax error at or near "DEFAULT"
-- ERREUR lors de la correction de la fonction get_available_slots: syntax error at or near "DEFAULT"
-- ÉCHEC de la correction via ALTER FUNCTION pour get_available_slots: syntax error at or near "DEFAULT"
-- ERREUR lors de la correction de la fonction get_provider_availability_slots: syntax error at or near "DEFAULT"
-- ÉCHEC de la correction via ALTER FUNCTION pour get_provider_availability_slots: syntax error at or near "DEFAULT"

-- ============================================================
-- INSTRUCTIONS POUR DÉPLACER POSTGIS (REQUIERT PRIVILÈGES ADMIN)
-- ============================================================
-- Cette opération nécessite une maintenance planifiée:

-- 1. Sauvegarde des données spatiales
-- BACKUP DATABASE postgres TO '/path/to/backup';

-- 2. Création du schéma dédié
-- CREATE SCHEMA IF NOT EXISTS extensions;

-- 3. Déplacer PostGIS (approche complète)
-- DROP EXTENSION postgis CASCADE;
-- SET search_path TO extensions;
-- CREATE EXTENSION postgis;
-- SET search_path TO public;

-- 4. Restaurer les données et réindexer si nécessaire
-- ============================================================

