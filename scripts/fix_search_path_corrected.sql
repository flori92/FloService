-- Script corrigé pour ajouter le paramètre search_path aux fonctions
-- Créé le 3 juin 2025

-- Approche alternative: modifier les fonctions existantes en préservant leur structure

-- 1. D'abord, récupérons les définitions actuelles des fonctions
DO $$
DECLARE
    func_record RECORD;
    func_def TEXT;
    func_name TEXT;
    func_schema TEXT;
    func_args TEXT;
    func_body TEXT;
    func_language TEXT;
    func_return TEXT;
    new_def TEXT;
BEGIN
    FOR func_record IN 
        SELECT 
            n.nspname AS schema_name,
            p.proname AS function_name,
            pg_get_functiondef(p.oid) AS function_def
        FROM 
            pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE 
            n.nspname = 'public' 
            AND p.proname IN (
                'check_migration_status',
                'handle_non_uuid',
                'is_valid_uuid',
                'get_safe_id',
                'find_nearby_providers',
                'check_provider_availability',
                'safe_message_count',
                'get_user_conversations',
                'is_provider',
                'update_provider_availability_timestamp',
                'get_available_slots',
                'get_provider_availability_slots'
            )
    LOOP
        func_schema := func_record.schema_name;
        func_name := func_record.function_name;
        func_def := func_record.function_def;
        
        -- Vérifier si la fonction a déjà un SET search_path
        IF func_def NOT LIKE '%SET search_path =%' THEN
            RAISE NOTICE 'Modification de la fonction %.%...', func_schema, func_name;
            
            -- Extraction des parties de la définition de fonction
            -- Exemple: CREATE OR REPLACE FUNCTION public.my_func(arg1 type) RETURNS type AS $$ BEGIN ... END; $$ LANGUAGE plpgsql;
            
            -- Extraire la partie avant le corps de la fonction (AS $$ ou AS $function$)
            func_args := substring(func_def from '^CREATE OR REPLACE FUNCTION [^(]+(.*) RETURNS ');
            func_return := substring(func_def from 'RETURNS ([^AS]+)');
            func_language := substring(func_def from 'LANGUAGE ([a-zA-Z]+)');
            
            -- Extraire le corps de la fonction
            IF func_def LIKE '%AS $function$%' THEN
                func_body := substring(func_def from 'AS \$function\$(.*)\$function\$' for '$1');
            ELSIF func_def LIKE '%AS $$%' THEN
                func_body := substring(func_def from 'AS \$\$(.*)\$\$' for '$1');
            END IF;
            
            -- Construire la nouvelle définition avec SET search_path
            new_def := format('
                DROP FUNCTION IF EXISTS %I.%I%s;
                CREATE OR REPLACE FUNCTION %I.%I%s
                RETURNS %s
                LANGUAGE %s
                SECURITY DEFINER
                SET search_path = public, pg_temp
                AS $body$%s$body$;
            ', 
            func_schema, func_name, func_args,
            func_schema, func_name, func_args,
            func_return, func_language, func_body);
            
            -- Exécuter la nouvelle définition
            BEGIN
                EXECUTE new_def;
                RAISE NOTICE 'Fonction %.% modifiée avec succès', func_schema, func_name;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Erreur lors de la modification de %.%: %', func_schema, func_name, SQLERRM;
            END;
        ELSE
            RAISE NOTICE 'La fonction %.% a déjà un chemin de recherche défini', func_schema, func_name;
        END IF;
    END LOOP;
END $$;

-- 2. Vérifier les résultats
SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_def
FROM 
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE 
    n.nspname = 'public' 
    AND p.proname IN (
        'check_migration_status',
        'handle_non_uuid',
        'is_valid_uuid',
        'get_safe_id',
        'find_nearby_providers',
        'check_provider_availability',
        'safe_message_count',
        'get_user_conversations',
        'is_provider',
        'update_provider_availability_timestamp',
        'get_available_slots',
        'get_provider_availability_slots'
    );

-- 3. Créer une vue sécurisée pour l'extension PostGIS
-- Cette approche est plus sûre que d'essayer de déplacer l'extension
CREATE OR REPLACE VIEW extensions.spatial_ref_sys AS
SELECT * FROM public.spatial_ref_sys;

-- Révoquer les droits d'accès directs à la table originale pour les rôles anon et authenticated
REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated;

-- Accorder des droits sur la vue sécurisée
GRANT SELECT ON extensions.spatial_ref_sys TO anon, authenticated;

-- 4. Recommandations pour les autres alertes de sécurité
COMMENT ON DATABASE postgres IS 'Pour résoudre les alertes de sécurité restantes:
1. Auth OTP long expiry: Réduire la durée d''expiration des OTP à moins d''une heure dans les paramètres d''authentification Supabase.
2. Leaked Password Protection: Activer la protection contre les mots de passe compromis dans les paramètres d''authentification Supabase.
Ces paramètres doivent être modifiés via l''interface d''administration Supabase.';
