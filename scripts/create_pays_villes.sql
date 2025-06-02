-- Script de création des tables pays et villes
-- Créé le 02/06/2025

-- Création de la table pays si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.pays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL UNIQUE,
  code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Création de la table villes si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.villes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  pays_id UUID REFERENCES public.pays(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(nom, pays_id)
);

-- Création d'un index sur pays_id pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_villes_pays_id ON public.villes(pays_id);

-- Ajout des politiques RLS pour les tables pays et villes
ALTER TABLE public.pays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.villes ENABLE ROW LEVEL SECURITY;

-- Politiques pour la table pays
CREATE POLICY "Tout le monde peut voir les pays" 
  ON public.pays FOR SELECT 
  USING (true);

-- Politiques pour la table villes
CREATE POLICY "Tout le monde peut voir les villes" 
  ON public.villes FOR SELECT 
  USING (true);
