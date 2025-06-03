-- Script pour corriger les chemins de recherche mutables dans les fonctions
-- Créé le 3 juin 2025

-- Récupération des définitions des fonctions existantes
DO $$
DECLARE
    func_record RECORD;
    func_def TEXT;
    new_def TEXT;
    search_path_set BOOLEAN;
BEGIN
    -- Pour chaque fonction concernée
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
        func_def := func_record.function_def;
        
        -- Vérifier si search_path est déjà défini
        search_path_set := func_def LIKE '%SET search_path = %';
        
        IF NOT search_path_set THEN
            -- Trouver la position de AS $function$
            IF func_def LIKE '%AS $function$%' THEN
                -- Insérer SET search_path = public, pg_temp; avant le corps de la fonction
                new_def := regexp_replace(
                    func_def,
                    'AS \$function\$(.*)',
                    'AS $function$
                    SET search_path = public, pg_temp;
                    $1',
                    'g'
                );
                
                -- Exécuter la nouvelle définition
                RAISE NOTICE 'Correction du chemin de recherche pour la fonction %.%', 
                    func_record.schema_name, func_record.function_name;
                EXECUTE new_def;
            ELSE
                -- Si le format est différent, consigner une erreur
                RAISE WARNING 'Format de fonction non reconnu pour %.%. Correction manuelle requise.', 
                    func_record.schema_name, func_record.function_name;
            END IF;
        ELSE
            RAISE NOTICE 'La fonction %.% a déjà un chemin de recherche défini.', 
                func_record.schema_name, func_record.function_name;
        END IF;
    END LOOP;
END $$;

-- Vérification des résultats
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
