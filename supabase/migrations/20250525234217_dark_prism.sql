/*
  # Add Payments System and Update Booking Workflow
  
  1. New Tables
    - `payments` table for tracking payment transactions
      - `id` (uuid, primary key)
      - `booking_id` (uuid, references bookings)
      - `amount` (numeric)
      - `status` (payment_status enum)
      - `stripe_payment_id` (text)
      - `created_at` (timestamp)
  
  2. Changes
    - Add payment completion trigger to automatically confirm bookings
    - Add RLS policies for payment security
  
  3. Security
    - Enable RLS on payments table
    - Add policies for client payment creation
    - Add policies for payment viewing
*/

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