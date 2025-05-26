-- Create function to handle booking status updates
CREATE OR REPLACE FUNCTION handle_booking_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for status change
  INSERT INTO notifications (
    user_id,
    type,
    content
  )
  SELECT
    CASE 
      WHEN NEW.status = 'confirmed' THEN client_id
      WHEN NEW.status = 'completed' THEN provider_id
      WHEN NEW.status = 'cancelled' THEN 
        CASE 
          WHEN OLD.status = 'pending' THEN provider_id
          ELSE client_id
        END
    END,
    'booking_' || NEW.status,
    CASE
      WHEN NEW.status = 'confirmed' THEN 'Votre réservation a été confirmée'
      WHEN NEW.status = 'completed' THEN 'Une réservation a été marquée comme terminée'
      WHEN NEW.status = 'cancelled' THEN 'Une réservation a été annulée'
    END
  FROM bookings
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking status updates
CREATE TRIGGER on_booking_status_update
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_booking_status_update();

-- Create function to handle new reviews
CREATE OR REPLACE FUNCTION handle_new_review()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for provider
  INSERT INTO notifications (
    user_id,
    type,
    content
  )
  VALUES (
    NEW.provider_id,
    'new_review',
    'Vous avez reçu un nouvel avis'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new reviews
CREATE TRIGGER on_new_review
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_review();

-- Create function to handle review responses
CREATE OR REPLACE FUNCTION handle_review_response()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for client
  INSERT INTO notifications (
    user_id,
    type,
    content
  )
  SELECT
    reviews.client_id,
    'review_response',
    'Le prestataire a répondu à votre avis'
  FROM reviews
  WHERE reviews.id = NEW.review_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for review responses
CREATE TRIGGER on_review_response
  AFTER INSERT ON review_responses
  FOR EACH ROW
  EXECUTE FUNCTION handle_review_response();