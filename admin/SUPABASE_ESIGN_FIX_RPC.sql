-- Fix: "column f.page must appear in GROUP BY" error in hw_esign_signer_load
-- The ORDER BY was outside the aggregate; move it inside jsonb_agg().
-- Run in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION hw_esign_signer_load(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_signer hw_esign_signers%ROWTYPE;
    v_doc hw_esign_documents%ROWTYPE;
    v_fields JSONB;
BEGIN
    SELECT * INTO v_signer FROM hw_esign_signers WHERE token = p_token;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'invalid_token'); END IF;

    SELECT * INTO v_doc FROM hw_esign_documents WHERE id = v_signer.document_id;
    IF v_doc.status = 'voided' THEN RETURN jsonb_build_object('error', 'voided'); END IF;

    SELECT COALESCE(jsonb_agg(row_to_json(f) ORDER BY f.page, f.y, f.x), '[]'::jsonb)
      INTO v_fields
      FROM hw_esign_fields f WHERE f.signer_id = v_signer.id;

    RETURN jsonb_build_object(
        'signer', row_to_json(v_signer),
        'document', row_to_json(v_doc),
        'fields', v_fields
    );
END;
$$;
