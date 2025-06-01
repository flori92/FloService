-- Script de correction des problèmes de sécurité - Fonctions avec chemin de recherche mutable
-- Généré automatiquement le 2025-06-01T09:34:37.141Z

-- ERREUR lors de la modification de la fonction safe_message_count: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): safe_message_count

                      CREATE OR REPLACE FUNCTION public.safe_message_count(user_id uuid)
                      RETURNS integer
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
DECLARE
  message_count INTEGER := 0;
BEGIN
  -- Vérifier si la table messages existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'messages'
  ) THEN
    -- Si elle existe, compter les messages
    SELECT COUNT(*) INTO message_count
    FROM public.messages
    WHERE recipient_id = user_id AND read = false;
  END IF;
  
  RETURN message_count;
END;

                      $function$;
                    

-- ERREUR lors de la modification de la fonction check_table_exists: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): check_table_exists

                      CREATE OR REPLACE FUNCTION public.check_table_exists(table_name text)
                      RETURNS boolean
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = table_name
  );
END;

                      $function$;
                    

-- ERREUR lors de la modification de la fonction get_user_id_from_external_id: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): get_user_id_from_external_id

                      CREATE OR REPLACE FUNCTION public.get_user_id_from_external_id(p_external_id text, p_provider_type text DEFAULT NULL::text)
                      RETURNS uuid
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
DECLARE
  v_user_id UUID;
BEGIN
  -- Si le type de fournisseur est spécifié, chercher uniquement pour ce type
  IF p_provider_type IS NOT NULL THEN
    SELECT user_id INTO v_user_id
    FROM public.external_id_mapping
    WHERE external_id = p_external_id
      AND provider_type = p_provider_type
    LIMIT 1;
  ELSE
    -- Sinon, chercher l'ID externe sans se soucier du type de fournisseur
    SELECT user_id INTO v_user_id
    FROM public.external_id_mapping
    WHERE external_id = p_external_id
    LIMIT 1;
  END IF;

  RETURN v_user_id;
END;

                      $function$;
                    

-- ERREUR lors de la modification de la fonction send_message: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): send_message

                      CREATE OR REPLACE FUNCTION public.send_message(p_conversation_id uuid, p_sender_id uuid, p_content text, p_message_type text DEFAULT 'text'::text, p_media_url text DEFAULT NULL::text, p_media_metadata jsonb DEFAULT NULL::jsonb)
                      RETURNS uuid
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
DECLARE
  v_message_id UUID;
  v_client_id UUID;
  v_provider_id UUID;
BEGIN
  -- Vérifier que l'expéditeur fait partie de la conversation
  SELECT client_id, provider_id INTO v_client_id, v_provider_id
  FROM public.conversations
  WHERE id = p_conversation_id
  AND (client_id = p_sender_id OR provider_id = p_sender_id);

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Conversation non trouvée ou accès non autorisé';
  END IF;

  -- Insérer le message
  INSERT INTO public.messages (
    conversation_id,
    sender_id,
    content,
    message_type,
    media_url,
    media_metadata,
    created_at
  ) VALUES (
    p_conversation_id,
    p_sender_id,
    p_content,
    COALESCE(p_message_type, 'text'),
    p_media_url,
    p_media_metadata,
    NOW()
  )
  RETURNING id INTO v_message_id;

  -- Mettre à jour la conversation
  UPDATE public.conversations
  SET 
    last_message = p_content,
    last_message_time = NOW(),
    updated_at = NOW()
  WHERE id = p_conversation_id;

  -- Créer une notification pour le destinataire
  INSERT INTO public.notifications (
    user_id,
    type,
    content,
    related_entity_id,
    created_at
  ) VALUES (
    CASE 
      WHEN p_sender_id = v_client_id THEN v_provider_id 
      ELSE v_client_id 
    END,
    'new_message',
    p_content,
    v_message_id,
    NOW()
  );

  RETURN v_message_id;
END;

                      $function$;
                    

-- ERREUR lors de la modification de la fonction get_or_create_conversation: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): get_or_create_conversation

                      CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_client_id uuid, p_provider_external_id text)
                      RETURNS uuid
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
DECLARE
  v_conversation_id UUID;
  v_provider_id UUID;
  v_client_profile_id TEXT;
BEGIN
  -- Vérifier si le client existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_client_id) THEN
    RAISE EXCEPTION 'Client non trouvé';
  END IF;

  -- Vérifier si une conversation existe déjà
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE client_id = p_client_id
    AND provider_external_id = p_provider_external_id
  LIMIT 1;

  -- Si aucune conversation n'existe, en créer une nouvelle
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (
      client_id,
      provider_external_id,
      last_message,
      last_message_time,
      created_at,
      updated_at
    ) VALUES (
      p_client_id,
      p_provider_external_id,
      '',
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;

                      $function$;
                    

-- ERREUR lors de la modification de la fonction update_categories_updated_at: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): update_categories_updated_at

                      CREATE OR REPLACE FUNCTION public.update_categories_updated_at()
                      RETURNS trigger
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;

                      $function$;
                    

-- ERREUR lors de la modification de la fonction update_subcategories_updated_at: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): update_subcategories_updated_at

                      CREATE OR REPLACE FUNCTION public.update_subcategories_updated_at()
                      RETURNS trigger
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;

                      $function$;
                    

-- ERREUR lors de la modification de la fonction update_portfolio_item_updated_at: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): update_portfolio_item_updated_at

                      CREATE OR REPLACE FUNCTION public.update_portfolio_item_updated_at()
                      RETURNS trigger
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;

                      $function$;
                    

-- ERREUR lors de la modification de la fonction update_user_settings_updated_at: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): update_user_settings_updated_at

                      CREATE OR REPLACE FUNCTION public.update_user_settings_updated_at()
                      RETURNS trigger
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;

                      $function$;
                    

-- ERREUR lors de la modification de la fonction handle_payment_completion: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): handle_payment_completion

                      CREATE OR REPLACE FUNCTION public.handle_payment_completion()
                      RETURNS trigger
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
BEGIN
  IF NEW.status = 'completed' AND OLD.status = 'pending' THEN
    UPDATE bookings
    SET status = 'confirmed'
    WHERE id = NEW.booking_id
    AND status = 'pending';
  END IF;
  RETURN NEW;
END;

                      $function$;
                    

-- ERREUR lors de la modification de la fonction create_booking_reminders: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): create_booking_reminders

                      CREATE OR REPLACE FUNCTION public.create_booking_reminders()
                      RETURNS trigger
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
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

                      $function$;
                    

-- ERREUR lors de la modification de la fonction handle_booking_status_update: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): handle_booking_status_update

                      CREATE OR REPLACE FUNCTION public.handle_booking_status_update()
                      RETURNS trigger
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
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

                      $function$;
                    

-- ERREUR lors de la modification de la fonction handle_new_review: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): handle_new_review

                      CREATE OR REPLACE FUNCTION public.handle_new_review()
                      RETURNS trigger
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
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

                      $function$;
                    

-- ERREUR lors de la modification de la fonction handle_review_response: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): handle_review_response

                      CREATE OR REPLACE FUNCTION public.handle_review_response()
                      RETURNS trigger
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
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

                      $function$;
                    

-- ERREUR lors de la modification de la fonction create_message_notification: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): create_message_notification

                      CREATE OR REPLACE FUNCTION public.create_message_notification()
                      RETURNS trigger
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
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

                      $function$;
                    

-- ERREUR lors de la modification de la fonction update_translations_updated_at: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): update_translations_updated_at

                      CREATE OR REPLACE FUNCTION public.update_translations_updated_at()
                      RETURNS trigger
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;

                      $function$;
                    

-- ERREUR lors de la modification de la fonction update_provider_rating: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): update_provider_rating

                      CREATE OR REPLACE FUNCTION public.update_provider_rating(provider_uuid uuid)
                      RETURNS void
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
BEGIN
  UPDATE profiles p
  SET 
    rating_average = COALESCE((
      SELECT AVG(rating) 
      FROM reviews 
      WHERE provider_id = provider_uuid
    ), 0),
    review_count = (
      SELECT COUNT(*) 
      FROM reviews 
      WHERE provider_id = provider_uuid
    )
  WHERE id = provider_uuid;
END;

                      $function$;
                    

-- ERREUR lors de la modification de la fonction update_provider_rating_trigger: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): update_provider_rating_trigger

                      CREATE OR REPLACE FUNCTION public.update_provider_rating_trigger()
                      RETURNS trigger
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_provider_rating(OLD.provider_id);
  ELSE
    PERFORM update_provider_rating(NEW.provider_id);
  END IF;
  RETURN NULL;
END;

                      $function$;
                    

-- ERREUR lors de la modification de la fonction find_nearby_providers: syntax error at or near "SET"
-- ÉCHEC de la méthode alternative pour find_nearby_providers: cannot change return type of existing function
-- ERREUR lors de la modification de la fonction check_provider_availability: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): check_provider_availability

                      CREATE OR REPLACE FUNCTION public.check_provider_availability(p_provider_id uuid, p_start_time timestamp with time zone, p_duration_minutes integer)
                      RETURNS boolean
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
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

                      $function$;
                    

-- ERREUR lors de la modification de la fonction update_updated_at_column: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): update_updated_at_column

                      CREATE OR REPLACE FUNCTION public.update_updated_at_column()
                      RETURNS trigger
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;

                      $function$;
                    

-- ERREUR lors de la modification de la fonction update_service_area_geometry: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): update_service_area_geometry

                      CREATE OR REPLACE FUNCTION public.update_service_area_geometry()
                      RETURNS trigger
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
BEGIN
    -- Mettre à jour la géométrie si les coordonnées changent
    IF TG_OP = 'INSERT' OR OLD.lat IS DISTINCT FROM NEW.lat OR OLD.lng IS DISTINCT FROM NEW.lng THEN
        NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
    END IF;
    RETURN NEW;
END;

                      $function$;
                    

-- ERREUR lors de la modification de la fonction update_booking_timestamp: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): update_booking_timestamp

                      CREATE OR REPLACE FUNCTION public.update_booking_timestamp()
                      RETURNS trigger
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;

                      $function$;
                    

-- ERREUR lors de la modification de la fonction cancel_booking: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): cancel_booking

                      CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid, p_cancelled_by uuid, p_reason text DEFAULT NULL::text)
                      RETURNS jsonb
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
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

                      $function$;
                    

-- ERREUR lors de la modification de la fonction complete_booking: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): complete_booking

                      CREATE OR REPLACE FUNCTION public.complete_booking(p_booking_id uuid, p_completed_by uuid, p_notes text DEFAULT NULL::text)
                      RETURNS jsonb
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
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

                      $function$;
                    

-- ERREUR lors de la modification de la fonction get_available_slots: syntax error at or near "SET"
-- ÉCHEC de la méthode alternative pour get_available_slots: cannot change return type of existing function
-- ERREUR lors de la modification de la fonction encrypt_access_token: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): encrypt_access_token

                      CREATE OR REPLACE FUNCTION public.encrypt_access_token()
                      RETURNS trigger
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
BEGIN
  NEW.access_token = encode(encrypt(NEW.access_token::bytea, current_setting('app.settings.jwt_secret')::bytea, 'aes'), 'base64');
  RETURN NEW;
END;

                      $function$;
                    

-- ERREUR lors de la modification de la fonction get_provider_availability_slots: syntax error at or near "SET"
-- ÉCHEC de la méthode alternative pour get_provider_availability_slots: cannot change return type of existing function
-- ERREUR lors de la modification de la fonction get_provider_stats: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): get_provider_stats

                      CREATE OR REPLACE FUNCTION public.get_provider_stats(p_provider_id uuid)
                      RETURNS jsonb
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
DECLARE
    v_stats JSONB;
    v_rating_avg NUMERIC;
    v_review_count INTEGER;
    v_completed_bookings BIGINT;
    v_total_bookings BIGINT;
    v_acceptance_rate NUMERIC;
    v_avg_response_time_seconds NUMERIC;
BEGIN
    -- Rating and review stats
    SELECT COALESCE(AVG(r.rating), 0), COUNT(r.id)
    INTO v_rating_avg, v_review_count
    FROM reviews r
    WHERE r.provider_id = p_provider_id AND r.status = 'approved';

    -- Booking stats
    SELECT 
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*)
    INTO v_completed_bookings, v_total_bookings
    FROM bookings b WHERE b.provider_id = p_provider_id;

    IF v_total_bookings > 0 THEN
        v_acceptance_rate := (COUNT(*) FILTER (WHERE status IN ('confirmed', 'completed')) * 100.0 / v_total_bookings)
                             FROM bookings WHERE provider_id = p_provider_id;
    ELSE
        v_acceptance_rate := 100.0;
    END IF;

    -- Average response time to first message in new conversations (simplified)
    SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (first_response.created_at - first_message.created_at))), 0)
    INTO v_avg_response_time_seconds
    FROM (
        SELECT c.id as conv_id, MIN(m.created_at) as created_at
        FROM conversations c
        JOIN messages m ON m.conversation_id = c.id
        WHERE c.provider_id = p_provider_id AND m.sender_id != p_provider_id
        GROUP BY c.id
    ) first_message
    JOIN (
        SELECT c.id as conv_id, MIN(m.created_at) as created_at
        FROM conversations c
        JOIN messages m ON m.conversation_id = c.id
        WHERE c.provider_id = p_provider_id AND m.sender_id = p_provider_id
        GROUP BY c.id
    ) first_response ON first_message.conv_id = first_response.conv_id
    WHERE first_response.created_at > first_message.created_at;

    v_stats := jsonb_build_object(
        'provider_id', p_provider_id,
        'rating_average', ROUND(v_rating_avg, 2),
        'review_count', v_review_count,
        'completed_bookings', v_completed_bookings,
        'total_bookings', v_total_bookings,
        'acceptance_rate_percent', ROUND(v_acceptance_rate, 2),
        'avg_response_time_seconds', ROUND(v_avg_response_time_seconds, 0),
        'last_updated', NOW()
    );
    RETURN v_stats;
END;

                      $function$;
                    

-- ERREUR lors de la modification de la fonction geocode_and_update_provider_location: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): geocode_and_update_provider_location

                      CREATE OR REPLACE FUNCTION public.geocode_and_update_provider_location(p_provider_id uuid, p_address text, p_city text, p_postal_code text, p_country_code text)
                      RETURNS boolean
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
DECLARE
    v_full_address TEXT;
    v_latitude DOUBLE PRECISION; -- Simulé
    v_longitude DOUBLE PRECISION; -- Simulé
BEGIN
    v_full_address := concat_ws(', ', p_address, p_postal_code, p_city, p_country_code);
    
    -- *** Simulation de géocodage ***
    -- Dans un cas réel, appeler une API de géocodage ici.
    -- Par exemple: SELECT lat, lon INTO v_latitude, v_longitude FROM geocode_via_http(v_full_address);
    -- Pour la simulation, nous allons utiliser des valeurs fixes si l'adresse est spécifique
    IF lower(p_city) = 'abidjan' THEN
        v_latitude := 5.359952;
        v_longitude := -4.008256;
    ELSIF lower(p_city) = 'paris' THEN
        v_latitude := 48.8566;
        v_longitude := 2.3522;
    ELSE
        -- Fallback ou erreur si le géocodage échoue
        RAISE NOTICE 'Géocodage simulé échoué pour %', v_full_address;
        RETURN FALSE;
    END IF;
    
    UPDATE profiles
    SET 
        address = p_address,
        city = p_city,
        postal_code = p_postal_code,
        location = ST_SetSRID(ST_MakePoint(v_longitude, v_latitude), 4326)::GEOGRAPHY,
        updated_at = NOW()
    WHERE id = p_provider_id;
    
    RETURN FOUND;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erreur pendant geocode_and_update_provider_location: %', SQLERRM;
    RETURN FALSE;
END;

                      $function$;
                    

-- ERREUR lors de la modification de la fonction decrypt_access_token: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): decrypt_access_token

                      CREATE OR REPLACE FUNCTION public.decrypt_access_token(encrypted_token text)
                      RETURNS text
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
BEGIN
  RETURN convert_from(
    decrypt(
      decode(encrypted_token, 'base64')::bytea,
      current_setting('app.settings.jwt_secret')::bytea,
      'aes'
    ),
    'UTF8'
  );
END;

                      $function$;
                    

-- ERREUR lors de la modification de la fonction trigger_set_timestamp: syntax error at or near "SET"
-- Fonction recréée (méthode alternative): trigger_set_timestamp

                      CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
                      RETURNS trigger
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;

                      $function$;
                    


-- Création du schéma pour les extensions
CREATE SCHEMA IF NOT EXISTS extensions;

-- ERREUR lors du déplacement de l'extension PostGIS: extension "postgis" does not support SET SCHEMA
-- Cette opération peut nécessiter des privilèges d'administrateur PostgreSQL

-- RECOMMANDATIONS POUR L'AUTHENTIFICATION
-- Ces paramètres doivent être configurés dans l'interface Supabase ou via l'API d'administration
-- 1. Réduire l'expiration des OTP à moins d'une heure
-- 2. Activer la protection contre les mots de passe compromis
