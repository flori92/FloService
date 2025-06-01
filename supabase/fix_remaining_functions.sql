-- Script de correction manuelle des fonctions problématiques
-- Généré automatiquement le 2025-06-01T14:51:06.454Z

-- Correction de la fonction count_messages

ALTER FUNCTION public.count_messages(p_user_id uuid)
SET search_path = public;


-- Correction de la fonction mark_message_as_read

ALTER FUNCTION public.mark_message_as_read(p_message_id uuid)
SET search_path = public;


-- Correction de la fonction mark_messages_as_read

ALTER FUNCTION public.mark_messages_as_read(p_conversation_id uuid)
SET search_path = public;


-- Correction de la fonction send_message

ALTER FUNCTION public.send_message(p_conversation_id uuid, p_content text)
SET search_path = public;


-- ERREUR lors de la correction de la fonction safe_message_count: syntax error at or near "DEFAULT"
-- ÉCHEC de la correction via ALTER FUNCTION pour safe_message_count: syntax error at or near "DEFAULT"
-- Correction de la fonction check_table_exists

ALTER FUNCTION public.check_table_exists(table_name text)
SET search_path = public;


-- Correction de la fonction get_or_create_conversation

ALTER FUNCTION public.get_or_create_conversation(p_client_id uuid, p_provider_external_id text)
SET search_path = public;


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

