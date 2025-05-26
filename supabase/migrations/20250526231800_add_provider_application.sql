-- Création de la table pour les demandes de prestation
CREATE TABLE IF NOT EXISTS provider_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    bio TEXT NOT NULL,
    website TEXT,
    phone_number TEXT NOT NULL,
    address TEXT NOT NULL,
    city_code TEXT NOT NULL,
    country_code TEXT NOT NULL,
    languages TEXT[] NOT NULL,
    id_document_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_provider_applications_user_id ON provider_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_provider_applications_status ON provider_applications(status);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_provider_application_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Déclencheur pour updated_at
CREATE TRIGGER trigger_provider_application_updated_at
BEFORE UPDATE ON provider_applications
FOR EACH ROW EXECUTE FUNCTION update_provider_application_updated_at();

-- Politiques RLS pour les demandes de prestation
ALTER TABLE provider_applications ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres demandes
CREATE POLICY "Users can view their own applications"
ON provider_applications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Les utilisateurs peuvent créer des demandes
CREATE POLICY "Users can create applications"
ON provider_applications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Les administrateurs peuvent tout voir
CREATE POLICY "Admins can manage all applications"
ON provider_applications
FOR ALL
TO authenticated
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
));

-- Fonction pour soumettre une demande de prestation avec validation automatique
CREATE OR REPLACE FUNCTION submit_provider_application(
    p_business_name TEXT,
    p_bio TEXT,
    p_website TEXT,
    p_phone_number TEXT,
    p_address TEXT,
    p_city_code TEXT,
    p_country_code TEXT,
    p_languages TEXT[],
    p_id_document_url TEXT
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_profile_exists BOOLEAN;
    v_application_id UUID;
    v_application_status TEXT;
    v_validation_errors TEXT[] := '{}';
    v_validation_passed BOOLEAN := TRUE;
    v_validation_message TEXT;
    v_result JSONB;
BEGIN
    -- Vérifier que l'utilisateur a un profil
    SELECT EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id) INTO v_profile_exists;
    
    IF NOT v_profile_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User profile not found',
            'code', 'PROFILE_NOT_FOUND'
        );
    END IF;
    
    -- Validation des champs obligatoires
    IF p_business_name IS NULL OR p_business_name = '' THEN
        v_validation_errors := array_append(v_validation_errors, 'business_name is required');
        v_validation_passed := FALSE;
    END IF;
    
    IF p_bio IS NULL OR p_bio = '' THEN
        v_validation_errors := array_append(v_validation_errors, 'bio is required');
        v_validation_passed := FALSE;
    END IF;
    
    IF p_phone_number IS NULL OR p_phone_number = '' THEN
        v_validation_errors := array_append(v_validation_errors, 'phone_number is required');
        v_validation_passed := FALSE;
    END IF;
    
    IF p_address IS NULL OR p_address = '' THEN
        v_validation_errors := array_append(v_validation_errors, 'address is required');
        v_validation_passed := FALSE;
    END IF;
    
    IF p_city_code IS NULL OR p_city_code = '' THEN
        v_validation_errors := array_append(v_validation_errors, 'city_code is required');
        v_validation_passed := FALSE;
    END IF;
    
    IF p_country_code IS NULL OR p_country_code = '' THEN
        v_validation_errors := array_append(v_validation_errors, 'country_code is required');
        v_validation_passed := FALSE;
    END IF;
    
    IF p_languages IS NULL OR array_length(p_languages, 1) IS NULL THEN
        v_validation_errors := array_append(v_validation_errors, 'at least one language is required');
        v_validation_passed := FALSE;
    END IF;
    
    IF p_id_document_url IS NULL OR p_id_document_url = '' THEN
        v_validation_errors := array_append(v_validation_errors, 'id_document_url is required');
        v_validation_passed := FALSE;
    END IF;
    
    -- Si la validation échoue, retourner les erreurs
    IF NOT v_validation_passed THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Validation failed',
            'errors', v_validation_errors,
            'code', 'VALIDATION_ERROR'
        );
    END IF;
    
    -- Vérifier s'il y a une demande en attente
    SELECT id, status INTO v_application_id, v_application_status
    FROM provider_applications
    WHERE user_id = v_user_id
    AND status = 'pending'
    LIMIT 1;
    
    -- Si une demande en attente existe, la retourner
    IF v_application_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'You already have a pending application',
            'application_id', v_application_id,
            'status', v_application_status,
            'code', 'PENDING_APPLICATION_EXISTS'
        );
    END IF;
    
    -- Vérifier si l'utilisateur est déjà prestataire
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = v_user_id 
        AND status = 'approved' 
        AND role = 'provider'
    ) INTO v_validation_passed;
    
    IF v_validation_passed THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'You are already an approved provider',
            'code', 'ALREADY_PROVIDER'
        );
    END IF;
    
    -- Créer la demande de prestation
    INSERT INTO provider_applications (
        user_id,
        business_name,
        bio,
        website,
        phone_number,
        address,
        city_code,
        country_code,
        languages,
        id_document_url,
        status
    ) VALUES (
        v_user_id,
        p_business_name,
        p_bio,
        p_website,
        p_phone_number,
        p_address,
        p_city_code,
        p_country_code,
        p_languages,
        p_id_document_url,
        'pending' -- Statut initial
    )
    RETURNING id, status INTO v_application_id, v_application_status;
    
    -- Vérifier les critères de validation automatique
    -- Ici, nous pourrions ajouter des vérifications supplémentaires comme :
    -- - Vérification de l'email de l'utilisateur
    -- - Vérification de l'âge minimum
    -- - Vérification d'autres documents
    
    -- Pour l'exemple, nous allons considérer que la validation est automatique
    -- si tous les champs requis sont fournis
    UPDATE provider_applications
    SET 
        status = 'approved',
        reviewed_by = '00000000-0000-0000-0000-000000000000', -- Système
        reviewed_at = NOW()
    WHERE id = v_application_id
    RETURNING status INTO v_application_status;
    
    -- Mettre à jour le profil de l'utilisateur pour en faire un prestataire
    UPDATE profiles
    SET 
        business_name = p_business_name,
        bio = p_bio,
        website = p_website,
        phone_number = p_phone_number,
        address = p_address,
        city_code = p_city_code,
        country_code = p_country_code,
        languages = p_languages,
        status = 'approved',
        role = 'provider',
        updated_at = NOW()
    WHERE id = v_user_id;
    
    -- Retourner le résultat
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Application submitted and automatically approved',
        'application_id', v_application_id,
        'status', v_application_status,
        'code', 'APPLICATION_APPROVED_AUTOMATICALLY'
    );
    
EXCEPTION WHEN OTHERS THEN
    -- En cas d'erreur, annuler les modifications
    ROLLBACK;
    
    RETURN jsonb_build_object(
        'success', false,
        'message', SQLERRM,
        'code', 'INTERNAL_SERVER_ERROR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION submit_provider_application(
    TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT
) TO authenticated;

-- Fonction pour obtenir le statut de la demande de l'utilisateur connecté
CREATE OR REPLACE FUNCTION get_my_provider_application_status()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_application JSONB;
    v_is_provider BOOLEAN;
BEGIN
    -- Vérifier si l'utilisateur est déjà prestataire
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = v_user_id 
        AND status = 'approved' 
        AND role = 'provider'
    ) INTO v_is_provider;
    
    IF v_is_provider THEN
        RETURN jsonb_build_object(
            'status', 'approved',
            'is_provider', true,
            'message', 'You are already an approved provider'
        );
    END IF;
    
    -- Récupérer la dernière demande
    SELECT jsonb_build_object(
        'id', id,
        'status', status,
        'business_name', business_name,
        'bio', bio,
        'website', website,
        'phone_number', phone_number,
        'address', address,
        'city_code', city_code,
        'country_code', country_code,
        'languages', languages,
        'id_document_url', id_document_url,
        'rejection_reason', rejection_reason,
        'created_at', created_at,
        'updated_at', updated_at
    ) INTO v_application
    FROM provider_applications
    WHERE user_id = v_user_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_application IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'not_submitted',
            'is_provider', false,
            'message', 'No application submitted yet'
        );
    END IF;
    
    -- Ajouter le statut is_provider
    v_application := jsonb_set(
        v_application,
        '{is_provider}',
        'false',
        true
    );
    
    RETURN v_application;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION get_my_provider_application_status() TO authenticated;
