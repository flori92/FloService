/*
  # Booking and Payment System - Migration complémentaire
  
  Cette migration est un complément à la migration précédente (20250525234028_divine_rice.sql)
  qui a déjà créé la table bookings et ses politiques de base.
  
  Nous évitons de recréer les éléments existants pour éviter les erreurs.
*/

-- Note: La table bookings et ses politiques de base ont déjà été créées
-- dans la migration précédente. Cette migration ne contient que des
-- modifications complémentaires si nécessaire.

CREATE POLICY "Providers can confirm or cancel pending bookings_v2"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = provider_id AND
    status = 'pending'
  )
  WITH CHECK (
    status IN ('confirmed', 'cancelled')
    -- Nous ne pouvons pas vérifier OLD.payment_status dans une politique RLS
  );

CREATE POLICY "Providers can mark confirmed bookings as completed_v2"
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

-- La fonction handle_payment_completion et le trigger on_payment_completion
-- ont déjà été créés dans la migration précédente.
-- Nous ne les recréons pas ici pour éviter les erreurs de duplication.