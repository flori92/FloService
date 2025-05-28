-- Politiques de sécurité pour les buckets de stockage
-- Bucket invoices
BEGIN;
DROP POLICY IF EXISTS "Les factures sont accessibles publiquement" ON storage.objects;
CREATE POLICY "Les factures sont accessibles publiquement"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'invoices');

DROP POLICY IF EXISTS "Seuls les administrateurs peuvent insérer des factures" ON storage.objects;
CREATE POLICY "Seuls les administrateurs peuvent insérer des factures"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'invoices' AND (auth.role() = 'service_role' OR auth.role() = 'authenticated'));

-- Bucket attachments
DROP POLICY IF EXISTS "Les pièces jointes sont accessibles publiquement" ON storage.objects;
CREATE POLICY "Les pièces jointes sont accessibles publiquement"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'attachments');

DROP POLICY IF EXISTS "Les utilisateurs peuvent télécharger des pièces jointes" ON storage.objects;
CREATE POLICY "Les utilisateurs peuvent télécharger des pièces jointes"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'attachments' AND auth.role() = 'authenticated');
COMMIT;
