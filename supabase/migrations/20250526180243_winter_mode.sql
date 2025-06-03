/*
  # Extension du système de notifications - Ajout de triggers
  
  Cette migration complète le système de notifications créé dans la migration précédente
  (20250526180147_proud_harbor.sql) en ajoutant un trigger pour la création automatique
  de notifications lors de l'envoi de nouveaux messages.
  
  1. Fonctionnalités ajoutées
    - Fonction pour créer des notifications de message
    - Trigger pour exécuter cette fonction lors de l'insertion de nouveaux messages
*/

-- Note: La table notifications et ses politiques ont déjà été créées
-- dans la migration précédente. Cette migration ajoute uniquement
-- les fonctionnalités de notification automatique.

-- Création d'une politique supplémentaire pour la mise à jour des notifications
CREATE POLICY "Users can update their own notifications_v2"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Create function to create message notification
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Le trigger on_new_message a déjà été créé dans une migration précédente.
-- Nous ne le recréons pas ici pour éviter les erreurs de duplication.