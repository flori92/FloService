/*
  # Add messaging system
  
  1. New Tables
    - messages
      - id (uuid, primary key)
      - conversation_id (uuid, foreign key)
      - sender_id (uuid, foreign key)
      - content (text)
      - file_url (text)
      - file_type (text)
      - created_at (timestamptz)
  
  2. Storage
    - Create chat-attachments bucket
    - Add policies for upload and viewing
  
  3. Security
    - Enable RLS on messages table
    - Add policies for message access
*/

-- Modification de la table messages pour ajouter la colonne conversation_id
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view messages in their conversations"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.client_id = auth.uid() OR conversations.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.client_id = auth.uid() OR conversations.provider_id = auth.uid())
    )
    AND auth.uid() = sender_id
  );

-- Le bucket de stockage et les politiques ont déjà été créés dans la migration précédente
-- Nous ne les recréons pas ici pour éviter les erreurs de duplication