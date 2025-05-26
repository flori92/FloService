/*
  # Platform Improvements Migration

  1. Reviews System
    - Enhanced review system with verified badges
    - Detailed ratings
    - Review responses
    - Work photos

  2. Provider Profiles
    - Portfolio improvements
    - Certifications
    - Service areas
    - Detailed pricing

  3. Booking System
    - Availability calendar
    - Recurring bookings
    - Automated reminders
*/

-- Create service_areas table
CREATE TABLE IF NOT EXISTS service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  city_code text NOT NULL,
  radius integer NOT NULL, -- Service radius in km
  created_at timestamptz DEFAULT now()
);

-- Create certifications table
CREATE TABLE IF NOT EXISTS certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  issuer text NOT NULL,
  issue_date date NOT NULL,
  expiry_date date,
  verification_status text NOT NULL DEFAULT 'pending',
  document_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create portfolio_items table
CREATE TABLE IF NOT EXISTS portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  before_image_url text,
  after_image_url text,
  completion_date date,
  created_at timestamptz DEFAULT now()
);

-- Create service_pricing table
CREATE TABLE IF NOT EXISTS service_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price numeric NOT NULL,
  duration interval,
  is_recurring boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enhance reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  client_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  punctuality_rating integer CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  quality_rating integer CHECK (quality_rating >= 1 AND quality_rating <= 5),
  value_rating integer CHECK (value_rating >= 1 AND value_rating <= 5),
  communication_rating integer CHECK (communication_rating >= 1 AND communication_rating <= 5),
  comment text,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create review_responses table
CREATE TABLE IF NOT EXISTS review_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  response text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create review_photos table
CREATE TABLE IF NOT EXISTS review_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create provider_availability table
CREATE TABLE IF NOT EXISTS provider_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create booking_reminders table
CREATE TABLE IF NOT EXISTS booking_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  reminder_type text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_reminders ENABLE ROW LEVEL SECURITY;

-- Create policies for service areas
CREATE POLICY "Public can view service areas"
  ON service_areas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can manage their service areas"
  ON service_areas FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Create policies for certifications
CREATE POLICY "Public can view certifications"
  ON certifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can manage their certifications"
  ON certifications FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Create policies for portfolio items
CREATE POLICY "Public can view portfolio items"
  ON portfolio_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can manage their portfolio items"
  ON portfolio_items FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Create policies for service pricing
CREATE POLICY "Public can view service pricing"
  ON service_pricing FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can manage their service pricing"
  ON service_pricing FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM services
    WHERE services.id = service_pricing.service_id
    AND services.provider_id = auth.uid()
  ));

-- Create policies for reviews
CREATE POLICY "Public can view reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Clients can create reviews for their bookings"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
      AND bookings.client_id = auth.uid()
      AND bookings.status = 'completed'
    )
  );

-- Create policies for review responses
CREATE POLICY "Public can view review responses"
  ON review_responses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can respond to their reviews"
  ON review_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_id
      AND reviews.provider_id = auth.uid()
    )
  );

-- Create policies for review photos
CREATE POLICY "Public can view review photos"
  ON review_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add photos to their reviews"
  ON review_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_id
      AND reviews.client_id = auth.uid()
    )
  );

-- Create policies for provider availability
CREATE POLICY "Public can view provider availability"
  ON provider_availability FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can manage their availability"
  ON provider_availability FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Create function to automatically create booking reminders
CREATE OR REPLACE FUNCTION create_booking_reminders()
RETURNS TRIGGER AS $$
BEGIN
  -- Create email reminder 24h before
  INSERT INTO booking_reminders (
    booking_id,
    reminder_type,
    scheduled_for
  ) VALUES (
    NEW.id,
    'email',
    (NEW.date + NEW.time - interval '24 hours')
  );
  
  -- Create SMS reminder 2h before
  INSERT INTO booking_reminders (
    booking_id,
    reminder_type,
    scheduled_for
  ) VALUES (
    NEW.id,
    'sms',
    (NEW.date + NEW.time - interval '2 hours')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking reminders
CREATE TRIGGER create_booking_reminders_trigger
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_booking_reminders();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_areas_provider ON service_areas(provider_id);
CREATE INDEX IF NOT EXISTS idx_certifications_provider ON certifications(provider_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_provider ON portfolio_items(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_pricing_service ON service_pricing(service_id);
CREATE INDEX IF NOT EXISTS idx_reviews_provider ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_review_responses_review ON review_responses(review_id);
CREATE INDEX IF NOT EXISTS idx_review_photos_review ON review_photos(review_id);
CREATE INDEX IF NOT EXISTS idx_provider_availability_provider ON provider_availability(provider_id);
CREATE INDEX IF NOT EXISTS idx_booking_reminders_booking ON booking_reminders(booking_id);