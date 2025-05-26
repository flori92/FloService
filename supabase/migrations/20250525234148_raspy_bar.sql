/*
  # Booking System Implementation

  1. New Tables
    - `bookings`
      - `id` (uuid, primary key)
      - `service_id` (uuid, foreign key)
      - `client_id` (uuid, foreign key)
      - `provider_id` (uuid, foreign key)
      - `amount` (numeric)
      - `status` (booking_status)
      - `date` (date)
      - `time` (time)
      - `notes` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on bookings table
    - Policies for clients and providers
    - Trigger for handling booking status updates
*/

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  client_id uuid REFERENCES users(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES users(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  status booking_status DEFAULT 'pending',
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
    status IN ('confirmed', 'cancelled')
  );

CREATE POLICY "Providers can mark confirmed bookings as completed"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = provider_id AND
    status = 'confirmed'
  )
  WITH CHECK (
    status = 'completed'
  );

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  status payment_status DEFAULT 'pending',
  stripe_payment_id text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies for payments
CREATE POLICY "Clients can create payments"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
      AND bookings.client_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

-- Create function to handle payment completion
CREATE OR REPLACE FUNCTION handle_payment_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status = 'pending' THEN
    UPDATE bookings
    SET status = 'confirmed'
    WHERE id = NEW.booking_id
    AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment completion
CREATE TRIGGER on_payment_completion
  AFTER UPDATE ON payments
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status = 'pending')
  EXECUTE FUNCTION handle_payment_completion();