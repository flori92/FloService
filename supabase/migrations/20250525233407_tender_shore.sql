/*
  # Add messaging system with file attachments

  1. Changes
    - Add messages table with file attachment support
    - Add RLS policies for secure message access
    - Create storage bucket for file attachments
    - Add storage policies for secure file handling

  2. Security
    - Enable RLS on messages table
    - Add policies to ensure users can only access their own conversations
    - Secure file storage access with appropriate policies
*/

-- Create messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content text,
  file_url text,
  file_type text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;

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

-- Create storage bucket for attachments if it doesn't exist
INSERT INTO storage.buckets (id, name)
VALUES ('chat-attachments', 'chat-attachments')
ON CONFLICT DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat attachments" ON storage.objects;

-- Create storage policies
CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "Users can view chat attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'chat-attachments');