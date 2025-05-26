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

-- Create messages table
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

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name)
VALUES ('chat-attachments', 'chat-attachments')
ON CONFLICT DO NOTHING;

-- Storage policies
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