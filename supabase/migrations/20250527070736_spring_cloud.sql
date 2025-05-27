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

-- Update RLS policies
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view approved reviews" ON reviews;
CREATE POLICY "Users can view approved reviews"
ON reviews
FOR SELECT
TO authenticated
USING (status = 'approved');

DROP POLICY IF EXISTS "Clients can create reviews for completed bookings" ON reviews;
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
);

-- Update conversations policies
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