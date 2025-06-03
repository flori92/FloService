/*
  # Migration vide - Fonctionnalités déjà implémentées
  
  Cette migration devait ajouter un trigger pour confirmer automatiquement les réservations
  lorsque les paiements sont complétés. Cependant, cette fonctionnalité a déjà été implémentée
  dans la migration 20250525234148_raspy_bar.sql.
  
  Pour éviter les erreurs de duplication, cette migration est maintenant vide.
*/

-- La fonction handle_payment_completion et le trigger on_payment_completion
-- ont déjà été créés dans une migration précédente.
-- Nous ne les recréons pas ici pour éviter les erreurs de duplication.

-- Cette migration est intentionnellement vide.