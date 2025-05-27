-- Migration pour ajouter la fonction update_updated_at_column
-- Date: 2025-05-27

-- Fonction utilitaire pour mettre à jour automatiquement les champs updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour la table provider_verifications
CREATE TRIGGER update_provider_verifications_updated_at
  BEFORE UPDATE ON public.provider_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Créer le trigger pour la table conversations
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Créer le trigger pour la table messages
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
