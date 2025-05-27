/*
  # Fix conversation system

  1. Changes
    - Add support for external provider IDs
    - Make provider_id nullable in conversations table
    - Add provider_external_id column
    - Update get_or_create_conversation function
    - Update RLS policies

  2. Security
    - Maintain RLS policies for conversations
    - Add policies for external providers
*/

-- Make provider_id nullable and add provider_external_id
ALTER TABLE conversations 
ALTER COLUMN provider_id DROP NOT NULL,
ADD COLUMN IF NOT EXISTS provider_external_id TEXT;

-- Create index for provider_external_id
CREATE INDEX IF NOT EXISTS idx_conversations_provider_external_id 
ON conversations(provider_external_id);

-- Update or create the get_or_create_conversation function
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_client_id UUID,
  p_provider_external_id TEXT
) 
RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id UUID;
  v_provider_id UUID;
BEGIN
  -- Vérifier si le client existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_client_id) THEN
    RAISE EXCEPTION 'Client non trouvé';
  END IF;

  -- Vérifier si une conversation existe déjà
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE client_id = p_client_id
    AND provider_external_id = p_provider_external_id;

  -- Si aucune conversation n'existe, en créer une nouvelle
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (
      client_id,
      provider_external_id,
      last_message,
      last_message_time,
      created_at,
      updated_at
    ) VALUES (
      p_client_id,
      p_provider_external_id,
      '',
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$$;

-- Update RLS policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;

CREATE POLICY "Users can view their conversations"
ON conversations
FOR SELECT
TO authenticated
USING (
  auth.uid() = client_id OR 
  auth.uid() = provider_id OR
  (provider_id IS NULL AND auth.uid() = client_id)
);

CREATE POLICY "Users can create conversations"
ON conversations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = client_id
);