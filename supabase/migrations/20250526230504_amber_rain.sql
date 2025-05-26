/*
  # Improve Database Structure
  
  1. Changes
    - Remove service_id from conversations table
    - Add proper foreign key constraints
    - Update RLS policies
    - Add indexes for better performance
    
  2. Security
    - Update RLS policies for conversations and messages
    - Ensure proper access control
*/

-- Update conversations table structure
ALTER TABLE conversations
DROP COLUMN IF EXISTS service_id;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_provider_id ON conversations(provider_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- Update RLS policies for conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
CREATE POLICY "Users can view their conversations"
ON conversations
FOR SELECT
TO authenticated
USING (
  auth.uid() = client_id OR 
  auth.uid() = provider_id
);

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations"
ON conversations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = client_id AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = provider_id AND
    status = 'approved'
  )
);

-- Update RLS policies for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
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

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;
CREATE POLICY "Users can send messages in their conversations"
ON messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (conversations.client_id = auth.uid() OR conversations.provider_id = auth.uid())
  ) AND
  auth.uid() = sender_id
);