-- ============================================================
-- Hay & Wilson eSign - Anon storage access for public signing
-- Run AFTER SUPABASE_ESIGN_SETUP.sql in Supabase SQL Editor
-- ============================================================
--
-- These policies let the public signer page (no admin login) read the
-- original PDF and upload the signed PDF. Security model: path-as-secret.
-- File paths are timestamped + random and only revealed after the signer
-- passes their token through the hw_esign_signer_load() RPC. The anon key
-- itself does not grant signer status — the token does.

-- Read originals and signed PDFs in the hw-esign bucket
CREATE POLICY esign_anon_read ON storage.objects FOR SELECT TO anon
    USING (bucket_id = 'hw-esign');

-- Insert signed PDFs (signer uploads their flattened result)
CREATE POLICY esign_anon_insert ON storage.objects FOR INSERT TO anon
    WITH CHECK (bucket_id = 'hw-esign');
