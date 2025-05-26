-- Migration pour ajouter les tags, améliorer la messagerie et ajouter les notifications
-- Date: 2025-05-27

BEGIN;

-- 1. Système de Tags pour les Prestataires

CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL CHECK (char_length(name) > 0 AND char_length(name) <= 50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.tags IS 'Liste des tags/mots-clés que les prestataires peuvent associer à leur profil.';

CREATE TABLE IF NOT EXISTS public.provider_tags (
    provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (provider_id, tag_id)
);
COMMENT ON TABLE public.provider_tags IS 'Table de liaison entre les prestataires et leurs tags.';

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_provider_tags_provider_id ON public.provider_tags(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_tags_tag_id ON public.provider_tags(tag_id);

-- RLS pour tags et provider_tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to tags" ON public.tags
    FOR SELECT USING (true);

CREATE POLICY "Allow providers to manage their own tags" ON public.provider_tags
    FOR ALL USING (auth.uid() = provider_id)
    WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Allow authenticated users to read provider tags" ON public.provider_tags
    FOR SELECT USING (auth.role() = 'authenticated');

-- Il faudrait aussi mettre à jour la fonction find_nearby_providers pour inclure un filtre par tags.
-- Exemple de modification (à intégrer soigneusement dans la fonction existante) :
-- ALTER FUNCTION find_nearby_providers ADD PARAMETER p_tag_ids UUID[];
-- ... dans la clause WHERE ...
-- AND (p_tag_ids IS NULL OR EXISTS (
--     SELECT 1 FROM provider_tags pt WHERE pt.provider_id = p.id AND pt.tag_id = ANY(p_tag_ids)
-- ))
-- Et potentiellement ajouter les tags au search_vector du profil.

-- 2. Amélioration de la Table Messages pour médias riches

ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text',
    ADD COLUMN IF NOT EXISTS media_url TEXT,
    ADD COLUMN IF NOT EXISTS media_metadata JSONB;

COMMENT ON COLUMN public.messages.message_type IS 'Type de message (text, image, audio, video, file, url_preview).';
COMMENT ON COLUMN public.messages.media_url IS 'URL du média si applicable (stocké sur Supabase Storage par exemple).';
COMMENT ON COLUMN public.messages.media_metadata IS 'Métadonnées du média (taille, durée, dimensions, nom de fichier, etc.).';

-- Création d'un type ENUM pour message_type pourrait être plus robuste
-- CREATE TYPE public.message_content_type AS ENUM ('text', 'image', 'audio', 'video', 'file', 'url_preview');
-- ALTER TABLE public.messages ALTER COLUMN message_type TYPE public.message_content_type USING message_type::public.message_content_type;

-- 3. Système de Notifications

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (char_length(type) > 0 AND char_length(type) <= 50), -- ex: 'new_message', 'booking_update'
    title TEXT,
    content TEXT NOT NULL,
    related_entity_type TEXT CHECK (char_length(related_entity_type) <= 50),
    related_entity_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.notifications IS 'Stocke les notifications pour les utilisateurs.';

-- S'assurer que les colonnes existent avant de les commenter (robustesse)
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS related_entity_id UUID;

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS related_entity_type TEXT CHECK (char_length(related_entity_type) <= 50);

COMMENT ON COLUMN public.notifications.type IS 'Type de notification (e.g., new_message, booking_request, booking_confirmed).';
COMMENT ON COLUMN public.notifications.related_entity_type IS 'Type de l''entité liée (e.g., conversation, booking).';
COMMENT ON COLUMN public.notifications.related_entity_id IS 'ID de l''entité liée à la notification.';

-- S'assurer que la colonne is_read existe avant de la commenter (robustesse)
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN public.notifications.is_read IS 'État de lecture de la notification.';

-- Index pour optimiser les requêtes de notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read ON public.notifications(user_id, is_read);

-- RLS pour notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own notifications" ON public.notifications
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- 4. Fonction pour obtenir ou créer une conversation (ébauche)
-- Cette fonction est un exemple, l'implémentation exacte dépendra de la logique d'appel API et des RLS.
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
    p_client_id UUID,
    p_provider_id UUID,
    p_service_id UUID DEFAULT NULL
)
RETURNS UUID -- Returns conversation_id
LANGUAGE plpgsql
SECURITY DEFINER -- Ou invoker selon les besoins de RLS
AS $$
DECLARE
    v_conversation_id UUID;
BEGIN
    -- Vérifier si une conversation existe déjà
    SELECT id INTO v_conversation_id
    FROM public.conversations
    WHERE client_id = p_client_id
      AND provider_id = p_provider_id
      AND (service_id = p_service_id OR (service_id IS NULL AND p_service_id IS NULL))
    LIMIT 1;

    -- Si elle n'existe pas, la créer
    IF v_conversation_id IS NULL THEN
        INSERT INTO public.conversations (client_id, provider_id, service_id)
        VALUES (p_client_id, p_provider_id, p_service_id)
        RETURNING id INTO v_conversation_id;
    END IF;

    RETURN v_conversation_id;
END;
$$;
COMMENT ON FUNCTION public.get_or_create_conversation IS 'Récupère une conversation existante ou en crée une nouvelle entre un client et un prestataire pour un service donné (optionnel).';

-- Trigger pour mettre à jour `updated_at` sur `tags` et `notifications`
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_tags_updated_at
BEFORE UPDATE ON public.tags
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TRIGGER set_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

COMMIT;
