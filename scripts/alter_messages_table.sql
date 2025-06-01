-- Script pour ajouter les colonnes manquantes à la table messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE ;
