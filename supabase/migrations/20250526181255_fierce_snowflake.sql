/*
  # Add notifications system
  
  1. New Tables
    - notifications
      - id (uuid, primary key)
      - user_id (uuid, references auth.users)
      - type (text)
      - content (text) 
      - read (boolean)
      - created_at (timestamptz)

  2. Security
    - Enable RLS on notifications table
    - Add policies for viewing and updating notifications
    - Add trigger for message notifications

  3. Changes
    - Create notification trigger for new messages
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Create function to create message notification
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the conversation details
  WITH conversation_details AS (
    SELECT 
      CASE 
        WHEN c.client_id = NEW.sender_id THEN c.provider_id 
        ELSE c.client_id 
      END as recipient_id,
      p.full_name as sender_name
    FROM conversations c
    JOIN profiles p ON p.id = NEW.sender_id
    WHERE c.id = NEW.conversation_id
  )
  INSERT INTO notifications (user_id, type, content)
  SELECT 
    recipient_id,
    'message',
    COALESCE(sender_name, 'Someone') || ' sent you a message'
  FROM conversation_details;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new messages
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_notification();