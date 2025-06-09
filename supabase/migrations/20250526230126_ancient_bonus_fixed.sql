/*
  # Fix Reviews and Conversations Relationships

  1. Changes
    - Update reviews table foreign key relationships
    - Update conversations table structure
    - Add proper indexes and constraints
    
  2. Security
    - Maintain existing RLS policies
    - Add new policies for conversations
*/

-- Update reviews table relationships
ALTER TABLE reviews
DROP CONSTRAINT IF EXISTS reviews_client_id_fkey,
DROP CONSTRAINT IF EXISTS reviews_provider_id_fkey;

ALTER TABLE reviews
ADD CONSTRAINT reviews_client_id_fkey
  FOREIGN KEY (client_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE,
ADD CONSTRAINT reviews_provider_id_fkey
  FOREIGN KEY (provider_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

-- Update conversations table
ALTER TABLE conversations
DROP CONSTRAINT IF EXISTS conversations_service_id_fkey;

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS last_message text,
ADD COLUMN IF NOT EXISTS last_message_time timestamptz DEFAULT now();

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reviews_ratings
ON reviews(rating, status)
WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_conversations_participants
ON conversations(client_id, provider_id);

-- Update or create RLS policies
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
    -- Check if the policy exists before trying to drop it
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'reviews' 
        AND policyname = 'Users can view approved reviews'
    ) THEN
        DROP POLICY "Users can view approved reviews" ON reviews;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'reviews' 
        AND policyname = 'Clients can create reviews for completed bookings'
    ) THEN
        DROP POLICY "Clients can create reviews for completed bookings" ON reviews;
    END IF;
END
$$;

-- Create policies without IF NOT EXISTS
CREATE POLICY "Users can view approved reviews"
ON reviews
FOR SELECT
TO authenticated
USING (status = 'approved');

CREATE POLICY "Clients can create reviews for completed bookings"
ON reviews
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.client_id = auth.uid()
    AND bookings.provider_id = reviews.provider_id
    AND bookings.status = 'completed'
  )
  AND client_id = auth.uid()
);

-- Ensure conversations table has RLS enabled
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'conversations' 
        AND policyname = 'Users can view their conversations'
    ) THEN
        DROP POLICY "Users can view their conversations" ON conversations;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'conversations' 
        AND policyname = 'Users can update their conversations'
    ) THEN
        DROP POLICY "Users can update their conversations" ON conversations;
    END IF;
END
$$;

-- Create conversation policies
CREATE POLICY "Users can view their conversations"
ON conversations
FOR SELECT
USING (
  client_id = auth.uid() OR 
  provider_id = auth.uid()
);

CREATE POLICY "Users can update their conversations"
ON conversations
FOR UPDATE
USING (
  client_id = auth.uid() OR 
  provider_id = auth.uid()
)
WITH CHECK (
  client_id = auth.uid() OR 
  provider_id = auth.uid()
);
