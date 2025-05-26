/*
  # Add Payment Completion Trigger
  
  This migration adds a trigger to automatically confirm bookings when payments are completed.
  
  1. Changes
    - Creates a function to handle payment completion
    - Adds a trigger to automatically update booking status
*/

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