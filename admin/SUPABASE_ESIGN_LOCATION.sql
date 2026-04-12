-- ============================================================
-- Hay & Wilson eSign - Signer location (audit trail field)
-- Run AFTER SUPABASE_ESIGN_SETUP.sql in Supabase SQL Editor
-- ============================================================
--
-- Adds a `signer_location` column so the Identity on Audit Trail
-- section can capture a signing location (e.g. "Tempe, Arizona, USA")
-- that gets rendered on both the eSigned Block and the Certificate
-- of Completion.

ALTER TABLE hw_esign_signature_library ADD COLUMN IF NOT EXISTS signer_location TEXT;
