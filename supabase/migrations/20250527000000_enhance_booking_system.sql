-- Migration pour améliorer le système de réservation
-- Date: 2025-05-27

-- 0. S'assurer que le type payment_status et la colonne existent (correctif)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'refunded');
    END IF;
END$$;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS payment_status public.payment_status DEFAULT 'pending';

-- 0.1 S'assurer que la colonne is_admin existe dans profiles (correctif)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 1. Ajouter des colonnes pour la gestion avancée des réservations
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ GENERATED ALWAYS AS (date + time) STORED,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS service_duration_minutes INTEGER;

-- 2. Mettre à jour la fonction de mise à jour automatique
CREATE OR REPLACE FUNCTION update_booking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Créer le déclencheur pour la mise à jour automatique
CREATE TRIGGER trigger_update_booking_timestamp
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION update_booking_timestamp();

-- 4. Ajouter des contraintes de validation
ALTER TABLE bookings
ADD CONSTRAINT chk_booking_times CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL) OR
    (status != 'cancelled' AND cancelled_at IS NULL)
);

ALTER TABLE bookings
ADD CONSTRAINT chk_booking_completion CHECK (
    (status != 'completed' AND completed_at IS NULL AND completed_by IS NULL) OR
    (status = 'completed' AND completed_at IS NOT NULL AND completed_by IS NOT NULL)
);

-- 5. Créer une fonction pour annuler une réservation
CREATE OR REPLACE FUNCTION cancel_booking(
    p_booking_id UUID,
    p_cancelled_by UUID,
    p_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_booking RECORD;
    v_result JSONB;
BEGIN
    -- Vérifier si la réservation existe et est annulable
    SELECT * INTO v_booking 
    FROM bookings 
    WHERE id = p_booking_id
    AND status IN ('pending', 'confirmed');
    
    IF v_booking IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Réservation non trouvée ou non annulable',
            'code', 'BOOKING_NOT_CANCELLABLE'
        );
    END IF;
    
    -- Mettre à jour la réservation
    UPDATE bookings
    SET 
        status = 'cancelled',
        cancelled_at = NOW(),
        cancelled_by = p_cancelled_by,
        cancellation_reason = p_reason,
        updated_by = p_cancelled_by
    WHERE id = p_booking_id
    RETURNING 
        id, status, cancelled_at, cancellation_reason
    INTO v_booking;
    
    -- Retourner le résultat
    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking.id,
        'status', v_booking.status,
        'cancelled_at', v_booking.cancelled_at,
        'cancellation_reason', v_booking.cancellation_reason
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', SQLERRM,
        'code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Fonction pour compléter une réservation
CREATE OR REPLACE FUNCTION complete_booking(
    p_booking_id UUID,
    p_completed_by UUID,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_booking RECORD;
    v_result JSONB;
BEGIN
    -- Vérifier si la réservation peut être marquée comme terminée
    SELECT * INTO v_booking 
    FROM bookings 
    WHERE id = p_booking_id
    AND status = 'confirmed';
    
    IF v_booking IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Réservation non trouvée ou non complétable',
            'code', 'BOOKING_NOT_COMPLETABLE'
        );
    END IF;
    
    -- Mettre à jour la réservation
    UPDATE bookings
    SET 
        status = 'completed',
        completed_at = NOW(),
        completed_by = p_completed_by,
        notes = COALESCE(p_notes, notes),
        updated_by = p_completed_by
    WHERE id = p_booking_id
    RETURNING 
        id, status, completed_at, notes
    INTO v_booking;
    
    -- Retourner le résultat
    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking.id,
        'status', v_booking.status,
        'completed_at', v_booking.completed_at
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', SQLERRM,
        'code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Fonction pour vérifier la disponibilité d'un prestataire
CREATE OR REPLACE FUNCTION check_provider_availability(
    p_provider_id UUID,
    p_start_time TIMESTAMPTZ,
    p_duration_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_end_time TIMESTAMPTZ;
    v_is_available BOOLEAN;
    v_day_of_week INTEGER;
    v_start_time TIME;
    v_end_time_of_day TIME;
BEGIN
    -- Calculer l'heure de fin
    v_end_time := p_start_time + (p_duration_minutes * INTERVAL '1 minute');
    
    -- Vérifier si le créneau est dans les heures d'ouverture du prestataire
    v_day_of_week := EXTRACT(ISODOW FROM p_start_time)::INTEGER % 7;
    v_start_time := p_start_time::TIME;
    v_end_time_of_day := v_end_time::TIME;
    
    -- Vérifier la disponibilité dans l'horaire du prestataire
    SELECT EXISTS (
        SELECT 1 
        FROM provider_availability pa
        WHERE pa.provider_id = p_provider_id
        AND pa.day_of_week = v_day_of_week
        AND pa.start_time <= v_start_time
        AND pa.end_time >= v_end_time_of_day
        AND pa.is_available = true
    ) INTO v_is_available;
    
    IF NOT v_is_available THEN
        RETURN FALSE;
    END IF;
    
    -- Vérifier les conflits avec d'autres réservations
    RETURN NOT EXISTS (
        SELECT 1 
        FROM bookings b
        WHERE b.provider_id = p_provider_id
        AND b.status IN ('pending', 'confirmed')
        AND (
            (p_start_time >= b.start_time AND p_start_time < COALESCE(b.end_time, b.start_time + (b.service_duration_minutes * INTERVAL '1 minute')))
            OR 
            (v_end_time > b.start_time AND v_end_time <= COALESCE(b.end_time, b.start_time + (b.service_duration_minutes * INTERVAL '1 minute')))
            OR
            (p_start_time <= b.start_time AND v_end_time >= COALESCE(b.end_time, b.start_time + (b.service_duration_minutes * INTERVAL '1 minute')))
        )
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- 8. Ajouter des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(date, time);
CREATE INDEX IF NOT EXISTS idx_bookings_timestamps ON bookings(created_at, updated_at);

-- 9. Mettre à jour les politiques de sécurité existantes
DROP POLICY IF EXISTS "Clients can create bookings" ON bookings;
CREATE POLICY "Clients can create bookings"
  ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = client_id AND
    payment_status = 'pending' AND
    status = 'pending' AND
    check_provider_availability(provider_id, start_time, service_duration_minutes)
  );

-- 10. Ajouter une politique pour permettre la mise à jour des réservations
CREATE POLICY "Users can update their bookings"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = client_id OR
    auth.uid() = provider_id
  )
  WITH CHECK (
    (auth.uid() = client_id AND status = 'pending') OR
    (auth.uid() = provider_id AND status IN ('confirmed', 'cancelled', 'completed'))
  );

-- 11. Ajouter une politique pour les administrateurs
CREATE POLICY "Admins can manage all bookings"
  ON bookings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 12. Créer une vue pour les statistiques de réservation
CREATE OR REPLACE VIEW booking_stats AS
SELECT 
    provider_id,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_bookings,
    COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_bookings,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_bookings,
    COUNT(*) FILTER (WHERE status = 'confirmed') AS upcoming_bookings,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600) FILTER (WHERE status = 'completed') AS avg_completion_hours,
    MIN(created_at) AS first_booking_date,
    MAX(created_at) AS last_booking_date
FROM bookings
GROUP BY provider_id;

-- 13. Ajouter des commentaires pour la documentation
COMMENT ON TABLE bookings IS 'Table des réservations de services entre clients et prestataires';
COMMENT ON COLUMN bookings.status IS 'Statut de la réservation: pending, confirmed, completed, cancelled';
COMMENT ON COLUMN bookings.payment_status IS 'Statut du paiement: pending, completed, refunded';
COMMENT ON COLUMN bookings.metadata IS 'Métadonnées supplémentaires au format JSON';

-- 14. Créer une fonction pour obtenir les créneaux disponibles
CREATE OR REPLACE FUNCTION get_available_slots(
    p_provider_id UUID,
    p_date DATE,
    p_duration_minutes INTEGER DEFAULT 60,
    p_time_slot_interval INTEGER DEFAULT 30
) RETURNS TABLE (start_time TIMESTAMPTZ, end_time TIMESTAMPTZ) AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
    v_day_of_week INTEGER;
    v_current_slot_start TIMESTAMPTZ;
    v_current_slot_end TIMESTAMPTZ;
    v_slot_interval INTERVAL;
BEGIN
    v_day_of_week := EXTRACT(ISODOW FROM p_date)::INTEGER % 7;
    v_slot_interval := (p_time_slot_interval * INTERVAL '1 minute');
    
    -- Parcourir les plages horaires disponibles pour ce jour
    FOR v_start_time, v_end_time IN
        SELECT 
            (p_date + pa.start_time) AT TIME ZONE 'UTC',
            LEAST(
                (p_date + pa.end_time) AT TIME ZONE 'UTC',
                (p_date + 1) AT TIME ZONE 'UTC' - INTERVAL '1 second'
            )
        FROM provider_availability pa
        WHERE pa.provider_id = p_provider_id
        AND pa.day_of_week = v_day_of_week
        AND pa.is_available = true
        ORDER BY pa.start_time
    LOOP
        -- Générer des créneaux dans cette plage horaire
        v_current_slot_start := v_start_time;
        v_current_slot_end := v_current_slot_start + (p_duration_minutes * INTERVAL '1 minute');
        
        -- Vérifier chaque créneau
        WHILE v_current_slot_end <= v_end_time LOOP
            -- Vérifier la disponibilité pour ce créneau
            IF check_provider_availability(
                p_provider_id, 
                v_current_slot_start, 
                p_duration_minutes
            ) THEN
                start_time := v_current_slot_start;
                end_time := v_current_slot_end;
                RETURN NEXT;
            END IF;
            
            -- Passer au créneau suivant
            v_current_slot_start := v_current_slot_start + v_slot_interval;
            v_current_slot_end := v_current_slot_end + v_slot_interval;
        END LOOP;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql STABLE;
