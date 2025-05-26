/*
  # Messages and Chat Attachments

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, references conversations)
      - `sender_id` (uuid, references users)
      - `content` (text)
      - `file_url` (text)
      - `file_type` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on messages table
    - Add policies for message viewing and sending
    - Create storage bucket for chat attachments
    - Add storage policies for attachments
*/

-- Create messages table if not exists
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

-- Create policies
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
    )
    AND auth.uid() = sender_id
  );

-- Create storage bucket for attachments if not exists
INSERT INTO storage.buckets (id, name)
VALUES ('chat-attachments', 'chat-attachments')
ON CONFLICT DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "Users can view chat attachments" ON storage.objects;
CREATE POLICY "Users can view chat attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'chat-attachments');