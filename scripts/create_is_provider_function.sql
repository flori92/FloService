-- Script de correction pour FloService
-- Ce script corrige les problèmes de structure de la table villes et crée la fonction is_provider

-- 1. Vérification et correction de la table villes
DO $$
BEGIN
    -- Vérifier si la table villes existe
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'villes') THEN
        -- Vérifier si la colonne pays_code existe
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'villes' AND column_name = 'pays_code') THEN
            -- Ajouter la colonne pays_code
            ALTER TABLE public.villes ADD COLUMN pays_code VARCHAR(2);
            
            -- Mettre à jour pays_code à partir de la table pays
            UPDATE public.villes v
            SET pays_code = p.code
            FROM public.pays p
            WHERE v.pays_id = p.id;
            
            -- Créer un index pour améliorer les performances
            CREATE INDEX IF NOT EXISTS idx_villes_pays_code ON public.villes(pays_code);
            
            -- Ajouter un commentaire
            COMMENT ON COLUMN public.villes.pays_code IS 'Code ISO à deux lettres du pays (ex: BJ, CM)';
        END IF;
    ELSE
        -- Créer la table villes si elle n'existe pas
        CREATE TABLE public.villes (
            id SERIAL PRIMARY KEY,
            nom VARCHAR(100) NOT NULL,
            pays_id INTEGER REFERENCES public.pays(id),
            pays_code VARCHAR(2),
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            population INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
        
        -- Ajouter des commentaires
        COMMENT ON TABLE public.villes IS 'Table des villes disponibles dans l''application';
        COMMENT ON COLUMN public.villes.pays_code IS 'Code ISO à deux lettres du pays (ex: BJ, CM)';
        
        -- Créer des index pour améliorer les performances
        CREATE INDEX idx_villes_pays_id ON public.villes(pays_id);
        CREATE INDEX idx_villes_pays_code ON public.villes(pays_code);
    END IF;
    
    -- Activer Row Level Security sur la table villes
    ALTER TABLE public.villes ENABLE ROW LEVEL SECURITY;
    
    -- Créer une politique pour permettre la lecture à tous
    DROP POLICY IF EXISTS villes_select_policy ON public.villes;
    CREATE POLICY villes_select_policy ON public.villes
        FOR SELECT USING (true);
    
    -- Limiter les modifications aux administrateurs
    DROP POLICY IF EXISTS villes_all_policy ON public.villes;
    CREATE POLICY villes_all_policy ON public.villes
        USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));
END
$$;

-- 2. Fonction pour vérifier si un utilisateur est un prestataire
CREATE OR REPLACE FUNCTION public.is_provider(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  provider_status boolean;
BEGIN
  -- Recherche dans la table profiles
  SELECT is_provider INTO provider_status
  FROM profiles
  WHERE id = user_id;
  
  -- Si aucun résultat, retourner false
  RETURN COALESCE(provider_status, false);
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, log et retourne false
    BEGIN
      PERFORM log_audit_action(
        'ERROR',
        'is_provider',
        format('Erreur lors de la vérification du statut prestataire pour %s: %s', user_id, SQLERRM)
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Si log_audit_action échoue, ignorer silencieusement
        NULL;
    END;
    RETURN false;
END;
$$;

-- Commentaire pour documenter la fonction
COMMENT ON FUNCTION public.is_provider(uuid) IS 'Vérifie si un utilisateur est un prestataire en consultant la colonne is_provider de la table profiles';

-- Accorder les droits d'exécution à anon et authenticated
GRANT EXECUTE ON FUNCTION public.is_provider(uuid) TO anon, authenticated;

-- 3. Créer une fonction de secours pour log_audit_action si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_action') THEN
    CREATE OR REPLACE FUNCTION public.log_audit_action(
      action_type text,
      action_name text,
      action_description text
    )
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
      -- Insérer dans une table d'audit si elle existe
      BEGIN
        INSERT INTO audit_logs (action_type, action_name, description, created_at)
        VALUES (action_type, action_name, action_description, now());
      EXCEPTION
        WHEN OTHERS THEN
          -- Si la table n'existe pas ou autre erreur, simplement ignorer
          NULL;
      END;
    END;
    $$;
    
    COMMENT ON FUNCTION public.log_audit_action(text, text, text) IS 'Fonction utilitaire pour journaliser les actions importantes dans le système';
    GRANT EXECUTE ON FUNCTION public.log_audit_action(text, text, text) TO authenticated;
  END IF;
END
$$;

-- 4. Ajouter des données de test pour les pays et villes si nécessaire
DO $$
DECLARE
  pays_count INTEGER;
BEGIN
  -- Vérifier si la table pays est vide
  SELECT COUNT(*) INTO pays_count FROM public.pays;
  
  IF pays_count = 0 THEN
    -- Insérer quelques pays d'Afrique
    INSERT INTO public.pays (nom, code, continent) VALUES
      ('Bénin', 'BJ', 'Afrique'),
      ('Cameroun', 'CM', 'Afrique'),
      ('Burkina Faso', 'BF', 'Afrique'),
      ('Gabon', 'GA', 'Afrique'),
      ('Côte d''Ivoire', 'CI', 'Afrique'),
      ('Sénégal', 'SN', 'Afrique'),
      ('Mali', 'ML', 'Afrique'),
      ('Niger', 'NE', 'Afrique'),
      ('Togo', 'TG', 'Afrique'),
      ('Guinée', 'GN', 'Afrique'),
      ('République démocratique du Congo', 'CD', 'Afrique'),
      ('Congo', 'CG', 'Afrique'),
      ('Maroc', 'MA', 'Afrique'),
      ('Algérie', 'DZ', 'Afrique'),
      ('Tunisie', 'TN', 'Afrique'),
      ('Cap-Vert', 'CV', 'Afrique'),
      ('Burundi', 'BI', 'Afrique')
    ON CONFLICT (code) DO NOTHING;
    
    -- Insérer 10 villes pour chaque pays
    -- Bénin (BJ)
    INSERT INTO public.villes (nom, pays_id, pays_code) VALUES
      ('Cotonou', (SELECT id FROM public.pays WHERE code = 'BJ'), 'BJ'),
      ('Porto-Novo', (SELECT id FROM public.pays WHERE code = 'BJ'), 'BJ'),
      ('Parakou', (SELECT id FROM public.pays WHERE code = 'BJ'), 'BJ'),
      ('Abomey-Calavi', (SELECT id FROM public.pays WHERE code = 'BJ'), 'BJ'),
      ('Djougou', (SELECT id FROM public.pays WHERE code = 'BJ'), 'BJ'),
      ('Bohicon', (SELECT id FROM public.pays WHERE code = 'BJ'), 'BJ'),
      ('Natitingou', (SELECT id FROM public.pays WHERE code = 'BJ'), 'BJ'),
      ('Lokossa', (SELECT id FROM public.pays WHERE code = 'BJ'), 'BJ'),
      ('Ouidah', (SELECT id FROM public.pays WHERE code = 'BJ'), 'BJ'),
      ('Aplahoué', (SELECT id FROM public.pays WHERE code = 'BJ'), 'BJ');
      
    -- Cameroun (CM)
    INSERT INTO public.villes (nom, pays_id, pays_code) VALUES
      ('Douala', (SELECT id FROM public.pays WHERE code = 'CM'), 'CM'),
      ('Yaoundé', (SELECT id FROM public.pays WHERE code = 'CM'), 'CM'),
      ('Garoua', (SELECT id FROM public.pays WHERE code = 'CM'), 'CM'),
      ('Bamenda', (SELECT id FROM public.pays WHERE code = 'CM'), 'CM'),
      ('Maroua', (SELECT id FROM public.pays WHERE code = 'CM'), 'CM'),
      ('Bafoussam', (SELECT id FROM public.pays WHERE code = 'CM'), 'CM'),
      ('Ngaoundéré', (SELECT id FROM public.pays WHERE code = 'CM'), 'CM'),
      ('Bertoua', (SELECT id FROM public.pays WHERE code = 'CM'), 'CM'),
      ('Loum', (SELECT id FROM public.pays WHERE code = 'CM'), 'CM'),
      ('Kumba', (SELECT id FROM public.pays WHERE code = 'CM'), 'CM');
      
    -- Burkina Faso (BF)
    INSERT INTO public.villes (nom, pays_id, pays_code) VALUES
      ('Ouagadougou', (SELECT id FROM public.pays WHERE code = 'BF'), 'BF'),
      ('Bobo-Dioulasso', (SELECT id FROM public.pays WHERE code = 'BF'), 'BF'),
      ('Koudougou', (SELECT id FROM public.pays WHERE code = 'BF'), 'BF'),
      ('Banfora', (SELECT id FROM public.pays WHERE code = 'BF'), 'BF'),
      ('Ouahigouya', (SELECT id FROM public.pays WHERE code = 'BF'), 'BF'),
      ('Kaya', (SELECT id FROM public.pays WHERE code = 'BF'), 'BF'),
      ('Tenkodogo', (SELECT id FROM public.pays WHERE code = 'BF'), 'BF'),
      ('Fada N’Gourma', (SELECT id FROM public.pays WHERE code = 'BF'), 'BF'),
      ('Dédougou', (SELECT id FROM public.pays WHERE code = 'BF'), 'BF'),
      ('Pô', (SELECT id FROM public.pays WHERE code = 'BF'), 'BF');
      
    -- Gabon (GA)
    INSERT INTO public.villes (nom, pays_id, pays_code) VALUES
      ('Libreville', (SELECT id FROM public.pays WHERE code = 'GA'), 'GA'),
      ('Port-Gentil', (SELECT id FROM public.pays WHERE code = 'GA'), 'GA'),
      ('Franceville', (SELECT id FROM public.pays WHERE code = 'GA'), 'GA'),
      ('Oyem', (SELECT id FROM public.pays WHERE code = 'GA'), 'GA'),
      ('Lambaréné', (SELECT id FROM public.pays WHERE code = 'GA'), 'GA'),
      ('Moanda', (SELECT id FROM public.pays WHERE code = 'GA'), 'GA'),
      ('Mouila', (SELECT id FROM public.pays WHERE code = 'GA'), 'GA'),
      ('Tchibanga', (SELECT id FROM public.pays WHERE code = 'GA'), 'GA'),
      ('Koulamoutou', (SELECT id FROM public.pays WHERE code = 'GA'), 'GA'),
      ('Makokou', (SELECT id FROM public.pays WHERE code = 'GA'), 'GA');
      
    -- Côte d'Ivoire (CI)
    INSERT INTO public.villes (nom, pays_id, pays_code) VALUES
      ('Abidjan', (SELECT id FROM public.pays WHERE code = 'CI'), 'CI'),
      ('Yamoussoukro', (SELECT id FROM public.pays WHERE code = 'CI'), 'CI'),
      ('Bouaké', (SELECT id FROM public.pays WHERE code = 'CI'), 'CI'),
      ('Daloa', (SELECT id FROM public.pays WHERE code = 'CI'), 'CI'),
      ('Korhogo', (SELECT id FROM public.pays WHERE code = 'CI'), 'CI'),
      ('San-Pédro', (SELECT id FROM public.pays WHERE code = 'CI'), 'CI'),
      ('Gagnoa', (SELECT id FROM public.pays WHERE code = 'CI'), 'CI'),
      ('Man', (SELECT id FROM public.pays WHERE code = 'CI'), 'CI'),
      ('Divo', (SELECT id FROM public.pays WHERE code = 'CI'), 'CI'),
      ('Abengourou', (SELECT id FROM public.pays WHERE code = 'CI'), 'CI');
      
    -- Sénégal (SN)
    INSERT INTO public.villes (nom, pays_id, pays_code) VALUES
      ('Dakar', (SELECT id FROM public.pays WHERE code = 'SN'), 'SN'),
      ('Thiès', (SELECT id FROM public.pays WHERE code = 'SN'), 'SN'),
      ('Kaolack', (SELECT id FROM public.pays WHERE code = 'SN'), 'SN'),
      ('Ziguinchor', (SELECT id FROM public.pays WHERE code = 'SN'), 'SN'),
      ('Saint-Louis', (SELECT id FROM public.pays WHERE code = 'SN'), 'SN'),
      ('Mbour', (SELECT id FROM public.pays WHERE code = 'SN'), 'SN'),
      ('Rufisque', (SELECT id FROM public.pays WHERE code = 'SN'), 'SN'),
      ('Tambacounda', (SELECT id FROM public.pays WHERE code = 'SN'), 'SN'),
      ('Louga', (SELECT id FROM public.pays WHERE code = 'SN'), 'SN'),
      ('Diourbel', (SELECT id FROM public.pays WHERE code = 'SN'), 'SN');
      
    -- Mali (ML)
    INSERT INTO public.villes (nom, pays_id, pays_code) VALUES
      ('Bamako', (SELECT id FROM public.pays WHERE code = 'ML'), 'ML'),
      ('Sikasso', (SELECT id FROM public.pays WHERE code = 'ML'), 'ML'),
      ('Mopti', (SELECT id FROM public.pays WHERE code = 'ML'), 'ML'),
      ('Ségou', (SELECT id FROM public.pays WHERE code = 'ML'), 'ML'),
      ('Kayes', (SELECT id FROM public.pays WHERE code = 'ML'), 'ML'),
      ('Koutiala', (SELECT id FROM public.pays WHERE code = 'ML'), 'ML'),
      ('Gao', (SELECT id FROM public.pays WHERE code = 'ML'), 'ML'),
      ('Kati', (SELECT id FROM public.pays WHERE code = 'ML'), 'ML'),
      ('Tombouctou', (SELECT id FROM public.pays WHERE code = 'ML'), 'ML'),
      ('Koulikoro', (SELECT id FROM public.pays WHERE code = 'ML'), 'ML');
      
    -- Togo (TG)
    INSERT INTO public.villes (nom, pays_id, pays_code) VALUES
      ('Lomé', (SELECT id FROM public.pays WHERE code = 'TG'), 'TG'),
      ('Sokodé', (SELECT id FROM public.pays WHERE code = 'TG'), 'TG'),
      ('Kara', (SELECT id FROM public.pays WHERE code = 'TG'), 'TG'),
      ('Kpalimé', (SELECT id FROM public.pays WHERE code = 'TG'), 'TG'),
      ('Atakpamé', (SELECT id FROM public.pays WHERE code = 'TG'), 'TG'),
      ('Bassar', (SELECT id FROM public.pays WHERE code = 'TG'), 'TG'),
      ('Tsévié', (SELECT id FROM public.pays WHERE code = 'TG'), 'TG'),
      ('Aného', (SELECT id FROM public.pays WHERE code = 'TG'), 'TG'),
      ('Mango', (SELECT id FROM public.pays WHERE code = 'TG'), 'TG'),
      ('Dapaong', (SELECT id FROM public.pays WHERE code = 'TG'), 'TG');
      
    -- Maroc (MA)
    INSERT INTO public.villes (nom, pays_id, pays_code) VALUES
      ('Casablanca', (SELECT id FROM public.pays WHERE code = 'MA'), 'MA'),
      ('Rabat', (SELECT id FROM public.pays WHERE code = 'MA'), 'MA'),
      ('Fès', (SELECT id FROM public.pays WHERE code = 'MA'), 'MA'),
      ('Marrakech', (SELECT id FROM public.pays WHERE code = 'MA'), 'MA'),
      ('Tanger', (SELECT id FROM public.pays WHERE code = 'MA'), 'MA'),
      ('Meknès', (SELECT id FROM public.pays WHERE code = 'MA'), 'MA'),
      ('Agadir', (SELECT id FROM public.pays WHERE code = 'MA'), 'MA'),
      ('Oujda', (SELECT id FROM public.pays WHERE code = 'MA'), 'MA'),
      ('Kénitra', (SELECT id FROM public.pays WHERE code = 'MA'), 'MA'),
      ('Tétouan', (SELECT id FROM public.pays WHERE code = 'MA'), 'MA');
      
    -- Burundi (BI)
    INSERT INTO public.villes (nom, pays_id, pays_code) VALUES
      ('Bujumbura', (SELECT id FROM public.pays WHERE code = 'BI'), 'BI'),
      ('Gitega', (SELECT id FROM public.pays WHERE code = 'BI'), 'BI'),
      ('Muyinga', (SELECT id FROM public.pays WHERE code = 'BI'), 'BI'),
      ('Ruyigi', (SELECT id FROM public.pays WHERE code = 'BI'), 'BI'),
      ('Ngozi', (SELECT id FROM public.pays WHERE code = 'BI'), 'BI'),
      ('Rumonge', (SELECT id FROM public.pays WHERE code = 'BI'), 'BI'),
      ('Bururi', (SELECT id FROM public.pays WHERE code = 'BI'), 'BI'),
      ('Kayanza', (SELECT id FROM public.pays WHERE code = 'BI'), 'BI'),
      ('Rutana', (SELECT id FROM public.pays WHERE code = 'BI'), 'BI'),
      ('Makamba', (SELECT id FROM public.pays WHERE code = 'BI'), 'BI');
      
    -- Cap-Vert (CV)
    INSERT INTO public.villes (nom, pays_id, pays_code) VALUES
      ('Praia', (SELECT id FROM public.pays WHERE code = 'CV'), 'CV'),
      ('Mindelo', (SELECT id FROM public.pays WHERE code = 'CV'), 'CV'),
      ('Santa Maria', (SELECT id FROM public.pays WHERE code = 'CV'), 'CV'),
      ('Assomada', (SELECT id FROM public.pays WHERE code = 'CV'), 'CV'),
      ('São Filipe', (SELECT id FROM public.pays WHERE code = 'CV'), 'CV'),
      ('Espargos', (SELECT id FROM public.pays WHERE code = 'CV'), 'CV'),
      ('Tarrafal', (SELECT id FROM public.pays WHERE code = 'CV'), 'CV'),
      ('Porto Novo', (SELECT id FROM public.pays WHERE code = 'CV'), 'CV'),
      ('Ribeira Brava', (SELECT id FROM public.pays WHERE code = 'CV'), 'CV'),
      ('Sal Rei', (SELECT id FROM public.pays WHERE code = 'CV'), 'CV');
  END IF;
END
$$;
