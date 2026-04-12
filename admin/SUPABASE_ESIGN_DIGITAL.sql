-- ============================================================
-- Hay & Wilson eSign - Digital (eSigned block) template
-- Run AFTER SUPABASE_ESIGN_SETUP.sql in Supabase SQL Editor
-- ============================================================
--
-- Adds a `digital_template` column to signature_library so that
-- "Digital" signatures (DocuSign-style boxed blocks with name,
-- company, and a dynamically filled sign date) can be rendered
-- natively into the PDF at sign time instead of being baked to
-- a static PNG at creation time.

ALTER TABLE hw_esign_signature_library ADD COLUMN IF NOT EXISTS digital_template JSONB;
