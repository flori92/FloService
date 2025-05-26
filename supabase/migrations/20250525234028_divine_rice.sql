/*
  # Système de réservation et paiement

  1. Nouvelles Tables
    - `bookings`
      - `id` (uuid, primary key)
      - `service_id` (uuid, référence au service)
      - `client_id` (uuid, référence au client)
      - `provider_id` (uuid, référence au prestataire)
      - `amount` (numeric, montant convenu)
      - `status` (booking_status: pending, confirmed, completed, cancelled)
      - `payment_status` (payment_status: pending, completed, refunded)
      - `date` (date de la prestation)
      - `time` (heure de la prestation)
      - `notes` (text, instructions spécifiques)
      - `created_at` (timestamp)

  2. Sécurité
    - Enable RLS sur la table bookings
    - Politiques pour clients et prestataires
*/

-- Create booking_status type if not exists
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- Create payment_status type if not exists
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'refunded');

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  client_id uuid REFERENCES users(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES users(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  status booking_status DEFAULT 'pending',
  payment_status payment_status DEFAULT 'pending',
  date date NOT NULL,
  time time NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policies for bookings
CREATE POLICY "Clients can create bookings"
  ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = client_id AND
    payment_status = 'pending' AND
    status = 'pending'
  );

CREATE POLICY "Clients can view their bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);

CREATE POLICY "Providers can view bookings for their services"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = provider_id);

CREATE POLICY "Providers can confirm or cancel pending bookings"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = provider_id AND
    status = 'pending'
  )
  WITH CHECK (
    status IN ('confirmed', 'cancelled') AND
    payment_status = OLD.payment_status
  );

CREATE POLICY "Providers can mark confirmed bookings as completed"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = provider_id AND
    status = 'confirmed' AND
    payment_status = 'completed'
  )
  WITH CHECK (
    status = 'completed' AND
    payment_status = 'completed'
  );

-- Create function to handle payment completion
CREATE OR REPLACE FUNCTION handle_payment_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- If payment is completed and booking is pending, automatically set status to confirmed
  IF NEW.payment_status = 'completed' AND OLD.payment_status = 'pending' THEN
    NEW.status := 'confirmed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment completion
CREATE TRIGGER on_payment_completion
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.payment_status = 'completed' AND OLD.payment_status = 'pending')
  EXECUTE FUNCTION handle_payment_completion();