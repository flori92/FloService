-- Migration pour ajouter le système de messagerie
-- Date: 2025-05-28

-- 1. Ajouter les colonnes nécessaires à la table profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- 2. Créer la table des messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Créer la table des conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant1_id, participant2_id)
);

-- 4. Ajouter des index pour améliorer les performances
DO $$
BEGIN
    -- Vérifier l'existence des colonnes avant de créer les index
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'recipient_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'created_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'read') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_messages_read ON public.messages(read)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'participant1_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_conversations_participant1_id ON public.conversations(participant1_id)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'participant2_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_conversations_participant2_id ON public.conversations(participant2_id)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_conversations_last_message_id ON public.conversations(last_message_id)';
    END IF;
END;
$$;

-- 5. Ajouter des déclencheurs pour mettre à jour les horodatages
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_messages_timestamp
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_conversations_timestamp
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Ajouter des politiques de sécurité RLS
DO $$
BEGIN
    -- Vérifier si les tables existent avant d'activer RLS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
        EXECUTE 'ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY';
        
        -- Vérifier si les colonnes nécessaires existent avant de créer les politiques
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_id')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'recipient_id') THEN
            
            -- Vérifier si la politique existe déjà
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Les utilisateurs peuvent voir leurs propres messages') THEN
                EXECUTE 'CREATE POLICY "Les utilisateurs peuvent voir leurs propres messages" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id)';
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Les utilisateurs peuvent envoyer des messages') THEN
                EXECUTE 'CREATE POLICY "Les utilisateurs peuvent envoyer des messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id)';
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Les utilisateurs peuvent mettre à jour leurs messages') THEN
                EXECUTE 'CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs messages" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id) WITH CHECK ((auth.uid() = sender_id AND (OLD.content = NEW.content)) OR (auth.uid() = recipient_id AND (OLD.content = NEW.content) AND (OLD.read <> NEW.read)))';
            END IF;
        END IF;
    END IF;
    
    -- Faire de même pour la table conversations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
        EXECUTE 'ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY';
        
        -- Vérifier si les colonnes nécessaires existent
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'participant1_id')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'participant2_id') THEN
            
            -- Vérifier si la politique existe déjà
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Les utilisateurs peuvent voir leurs propres conversations') THEN
                EXECUTE 'CREATE POLICY "Les utilisateurs peuvent voir leurs propres conversations" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() = participant1_id OR auth.uid() = participant2_id)';
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Les utilisateurs peuvent créer des conversations') THEN
                EXECUTE 'CREATE POLICY "Les utilisateurs peuvent créer des conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id)';
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Les utilisateurs peuvent mettre à jour leurs conversations') THEN
                EXECUTE 'CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs conversations" ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() = participant1_id OR auth.uid() = participant2_id)';
            END IF;
        END IF;
    END IF;
END;
$$;

-- 7. Créer une fonction pour obtenir les conversations d'un utilisateur
DO $$
BEGIN
    -- Vérifier si les tables et colonnes nécessaires existent
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'participant1_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'participant2_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'recipient_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'read')
    THEN
        -- Créer ou remplacer la fonction
        EXECUTE $FUNC$
        CREATE OR REPLACE FUNCTION get_user_conversations(user_id UUID)
        RETURNS TABLE (
          conversation_id UUID,
          other_participant_id UUID,
          other_participant_name TEXT,
          other_participant_avatar TEXT,
          last_message TEXT,
          last_message_time TIMESTAMPTZ,
          unread_count BIGINT
        ) AS $INNER$
        BEGIN
          RETURN QUERY
          SELECT
            c.id AS conversation_id,
            CASE
              WHEN c.participant1_id = user_id THEN c.participant2_id
              ELSE c.participant1_id
            END AS other_participant_id,
            p.full_name AS other_participant_name,
            p.avatar_url AS other_participant_avatar,
            m.content AS last_message,
            m.created_at AS last_message_time,
            COUNT(m2.id) FILTER (WHERE m2.recipient_id = user_id AND m2.read = false) AS unread_count
          FROM
            conversations c
          JOIN
            profiles p ON (
              CASE
                WHEN c.participant1_id = user_id THEN c.participant2_id
                ELSE c.participant1_id
              END = p.id
            )
          LEFT JOIN
            messages m ON c.last_message_id = m.id
          LEFT JOIN
            messages m2 ON (
              (m2.sender_id = p.id AND m2.recipient_id = user_id) OR
              (m2.sender_id = user_id AND m2.recipient_id = p.id)
            )
          WHERE
            c.participant1_id = user_id OR c.participant2_id = user_id
          GROUP BY
            c.id, other_participant_id, p.full_name, p.avatar_url, m.content, m.created_at
          ORDER BY
            m.created_at DESC NULLS LAST;
        END;
        $INNER$ LANGUAGE plpgsql SECURITY DEFINER;
        $FUNC$;
    END IF;
END;
$$;

-- 8. Créer une fonction pour mettre à jour la dernière conversation
DO $$
BEGIN
    -- Vérifier si les tables et colonnes nécessaires existent
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'participant1_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'participant2_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'recipient_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_id')
    THEN
        -- Créer ou remplacer la fonction
        EXECUTE $FUNC$
        CREATE OR REPLACE FUNCTION update_conversation_last_message()
        RETURNS TRIGGER AS $INNER$
        DECLARE
          v_conversation_id UUID;
        BEGIN
          -- Trouver ou créer la conversation
          SELECT id INTO v_conversation_id
          FROM conversations
          WHERE 
            (participant1_id = NEW.sender_id AND participant2_id = NEW.recipient_id) OR
            (participant1_id = NEW.recipient_id AND participant2_id = NEW.sender_id);
          
          IF v_conversation_id IS NULL THEN
            INSERT INTO conversations (participant1_id, participant2_id, last_message_id)
            VALUES (NEW.sender_id, NEW.recipient_id, NEW.id)
            RETURNING id INTO v_conversation_id;
          ELSE
            UPDATE conversations
            SET 
              last_message_id = NEW.id,
              updated_at = NOW()
            WHERE id = v_conversation_id;
          END IF;
          
          RETURN NEW;
        END;
        $INNER$ LANGUAGE plpgsql SECURITY DEFINER;
        $FUNC$;
        
        -- Vérifier si le trigger existe déjà
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_conversation_last_message') THEN
            EXECUTE 'DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON public.messages';
            EXECUTE 'CREATE TRIGGER trigger_update_conversation_last_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message()';
        END IF;
    END IF;
END;
$$;
