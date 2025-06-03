/*
  # Extension du système de paiement - Migration complémentaire
  
  Cette migration est un complément à la migration précédente (20250525234148_raspy_bar.sql)
  qui a déjà créé la table payments et certaines politiques de base.
  
  Nous évitons de recréer les éléments existants pour éviter les erreurs.
*/

-- Note: La table payments et ses politiques de base ont déjà été créées
-- dans la migration précédente. Cette migration ne contient que des
-- modifications complémentaires si nécessaire.

CREATE POLICY "Users can view their payments_v2"
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

-- La fonction handle_payment_completion et le trigger on_payment_completion
-- ont déjà été créés dans la migration précédente.
-- Nous ne les recréons pas ici pour éviter les erreurs de duplication.