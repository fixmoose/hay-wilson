-- ============================================================
-- Hay & Wilson eSign - Per-signature signer identity
-- Run AFTER SUPABASE_ESIGN_SETUP.sql in Supabase SQL Editor
-- ============================================================
--
-- Lets each saved signature carry its own identity (name/email/company)
-- so the audit trail and Certificate of Completion show the correct
-- person/entity for that signature — not the auth user's email.
-- Example: "Dejan Obradovic / dejan@haywilson.com / Hay & Wilson Electric"
-- vs a personal signature with different details.

ALTER TABLE hw_esign_signature_library ADD COLUMN IF NOT EXISTS signer_name TEXT;
ALTER TABLE hw_esign_signature_library ADD COLUMN IF NOT EXISTS signer_email TEXT;
ALTER TABLE hw_esign_signature_library ADD COLUMN IF NOT EXISTS signer_company TEXT;
