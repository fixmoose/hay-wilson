-- ============================================================
-- Hay & Wilson eSign - Supabase Database Setup
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Signature library (personal vault of reusable signatures/initials/stamps)
CREATE TABLE hw_esign_signature_library (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner TEXT NOT NULL DEFAULT 'dejan',
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('signature', 'initial', 'stamp')),
    source TEXT NOT NULL CHECK (source IN ('drawn', 'typed', 'uploaded', 'built')),
    image_data TEXT,          -- data URL for small images (PNG, transparent bg)
    image_path TEXT,          -- Storage path for larger images
    default_for_kind BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_hw_esign_lib_owner ON hw_esign_signature_library(owner);
CREATE INDEX idx_hw_esign_lib_kind ON hw_esign_signature_library(kind);

-- Only one default per (owner, kind)
CREATE UNIQUE INDEX idx_hw_esign_lib_unique_default
    ON hw_esign_signature_library(owner, kind)
    WHERE default_for_kind = TRUE;

-- 2. eSign documents
CREATE TABLE hw_esign_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    job_id UUID REFERENCES hw_jobs(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES hw_customers(id) ON DELETE SET NULL,
    original_pdf_path TEXT NOT NULL,
    signed_pdf_path TEXT,
    original_sha256 TEXT,
    signed_sha256 TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'viewed', 'signed', 'declined', 'voided')),
    page_count INTEGER,
    created_by TEXT,
    voided_at TIMESTAMPTZ,
    voided_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_hw_esign_docs_status ON hw_esign_documents(status);
CREATE INDEX idx_hw_esign_docs_job ON hw_esign_documents(job_id);
CREATE INDEX idx_hw_esign_docs_customer ON hw_esign_documents(customer_id);
CREATE INDEX idx_hw_esign_docs_created ON hw_esign_documents(created_at DESC);

CREATE TRIGGER hw_esign_docs_updated BEFORE UPDATE ON hw_esign_documents
    FOR EACH ROW EXECUTE FUNCTION hw_update_timestamp();

-- 3. Signers on a document (v1: one signer, but shape supports multi-signer later)
CREATE TABLE hw_esign_signers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES hw_esign_documents(id) ON DELETE CASCADE,
    sign_order INTEGER NOT NULL DEFAULT 1,
    kind TEXT NOT NULL CHECK (kind IN ('self', 'customer')),
    name TEXT NOT NULL,
    email TEXT,
    token TEXT UNIQUE,  -- random token for public signing link (customer only)
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'viewed', 'signed', 'declined')),
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    signed_at TIMESTAMPTZ,
    signed_ip TEXT,
    signed_user_agent TEXT,
    decline_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_hw_esign_signers_doc ON hw_esign_signers(document_id);
CREATE INDEX idx_hw_esign_signers_token ON hw_esign_signers(token) WHERE token IS NOT NULL;

-- 4. Fields placed on the document (positions as % of page so they survive scale)
CREATE TABLE hw_esign_fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES hw_esign_documents(id) ON DELETE CASCADE,
    signer_id UUID NOT NULL REFERENCES hw_esign_signers(id) ON DELETE CASCADE,
    page INTEGER NOT NULL,
    x NUMERIC(6,3) NOT NULL,       -- % of page width (0-100)
    y NUMERIC(6,3) NOT NULL,       -- % of page height (0-100)
    width NUMERIC(6,3) NOT NULL,
    height NUMERIC(6,3) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('signature', 'initial', 'stamp', 'date', 'text')),
    required BOOLEAN NOT NULL DEFAULT TRUE,
    library_signature_id UUID REFERENCES hw_esign_signature_library(id) ON DELETE SET NULL,
    value TEXT,                    -- filled value (text/date) or image data URL (sig/init/stamp)
    filled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_hw_esign_fields_doc ON hw_esign_fields(document_id);
CREATE INDEX idx_hw_esign_fields_signer ON hw_esign_fields(signer_id);

-- 5. Append-only audit log
CREATE TABLE hw_esign_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES hw_esign_documents(id) ON DELETE CASCADE,
    signer_id UUID REFERENCES hw_esign_signers(id) ON DELETE SET NULL,
    event TEXT NOT NULL
        CHECK (event IN ('created', 'prepared', 'sent', 'opened', 'viewed', 'field_filled', 'signed', 'declined', 'voided', 'downloaded')),
    ip TEXT,
    user_agent TEXT,
    meta JSONB,
    at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_hw_esign_audit_doc ON hw_esign_audit_log(document_id, at);

-- 6. RLS
ALTER TABLE hw_esign_signature_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE hw_esign_documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE hw_esign_signers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE hw_esign_fields             ENABLE ROW LEVEL SECURITY;
ALTER TABLE hw_esign_audit_log          ENABLE ROW LEVEL SECURITY;

-- Authenticated admin (you) has full access
CREATE POLICY esign_lib_auth_all ON hw_esign_signature_library FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY esign_docs_auth_all ON hw_esign_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY esign_signers_auth_all ON hw_esign_signers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY esign_fields_auth_all ON hw_esign_fields FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY esign_audit_auth_all ON hw_esign_audit_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Anonymous signer access via token: customer must be able to read the doc + fields + their own signer row,
-- and write the filled field values + signed status + audit events — BUT only when they hold a valid token.
-- We enforce this by checking a JWT-less custom header via a SECURITY DEFINER RPC (below), and expose
-- the public signer flow ONLY through those RPCs. Anon role gets no direct table access on these tables.

-- 7. RPC: token-gated signer flow (SECURITY DEFINER bypasses RLS; the function validates the token)

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

    SELECT COALESCE(jsonb_agg(row_to_json(f)), '[]'::jsonb) INTO v_fields
      FROM hw_esign_fields f WHERE f.signer_id = v_signer.id ORDER BY f.page, f.y, f.x;

    -- Note: we do NOT log viewed here — the client calls hw_esign_signer_event separately with the IP.
    RETURN jsonb_build_object(
        'signer', row_to_json(v_signer),
        'document', row_to_json(v_doc),
        'fields', v_fields
    );
END;
$$;

CREATE OR REPLACE FUNCTION hw_esign_signer_event(
    p_token TEXT,
    p_event TEXT,
    p_ip TEXT,
    p_user_agent TEXT,
    p_meta JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_signer hw_esign_signers%ROWTYPE;
BEGIN
    SELECT * INTO v_signer FROM hw_esign_signers WHERE token = p_token;
    IF NOT FOUND THEN RAISE EXCEPTION 'invalid_token'; END IF;

    IF p_event NOT IN ('opened', 'viewed', 'field_filled', 'declined') THEN
        RAISE EXCEPTION 'event_not_allowed';
    END IF;

    INSERT INTO hw_esign_audit_log(document_id, signer_id, event, ip, user_agent, meta)
    VALUES (v_signer.document_id, v_signer.id, p_event, p_ip, p_user_agent, p_meta);

    IF p_event = 'opened' AND v_signer.status = 'pending' THEN
        UPDATE hw_esign_signers SET status = 'viewed', viewed_at = NOW() WHERE id = v_signer.id;
        UPDATE hw_esign_documents SET status = 'viewed' WHERE id = v_signer.document_id AND status = 'sent';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION hw_esign_signer_submit(
    p_token TEXT,
    p_field_values JSONB,       -- [{id, value}, ...]
    p_signed_pdf_path TEXT,
    p_signed_sha256 TEXT,
    p_ip TEXT,
    p_user_agent TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_signer hw_esign_signers%ROWTYPE;
    v_fv JSONB;
BEGIN
    SELECT * INTO v_signer FROM hw_esign_signers WHERE token = p_token;
    IF NOT FOUND THEN RAISE EXCEPTION 'invalid_token'; END IF;
    IF v_signer.status = 'signed' THEN RAISE EXCEPTION 'already_signed'; END IF;

    FOR v_fv IN SELECT * FROM jsonb_array_elements(p_field_values)
    LOOP
        UPDATE hw_esign_fields
           SET value = v_fv->>'value', filled_at = NOW()
         WHERE id = (v_fv->>'id')::uuid AND signer_id = v_signer.id;
    END LOOP;

    UPDATE hw_esign_signers
       SET status = 'signed', signed_at = NOW(), signed_ip = p_ip, signed_user_agent = p_user_agent
     WHERE id = v_signer.id;

    UPDATE hw_esign_documents
       SET status = 'signed', signed_pdf_path = p_signed_pdf_path, signed_sha256 = p_signed_sha256
     WHERE id = v_signer.document_id;

    INSERT INTO hw_esign_audit_log(document_id, signer_id, event, ip, user_agent, meta)
    VALUES (v_signer.document_id, v_signer.id, 'signed', p_ip, p_user_agent,
            jsonb_build_object('signed_sha256', p_signed_sha256));

    RETURN jsonb_build_object('ok', true);
END;
$$;

-- Expose RPCs to anon role
GRANT EXECUTE ON FUNCTION hw_esign_signer_load(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION hw_esign_signer_event(TEXT, TEXT, TEXT, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION hw_esign_signer_submit(TEXT, JSONB, TEXT, TEXT, TEXT, TEXT) TO anon;

-- 8. Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('hw-esign', 'hw-esign', false)
    ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('hw-esign-signatures', 'hw-esign-signatures', false)
    ON CONFLICT (id) DO NOTHING;

-- Authenticated (admin) full access on both buckets
CREATE POLICY esign_bucket_auth ON storage.objects FOR ALL TO authenticated
    USING (bucket_id IN ('hw-esign', 'hw-esign-signatures'))
    WITH CHECK (bucket_id IN ('hw-esign', 'hw-esign-signatures'));

-- Anon read of hw-esign originals via signed URLs (the sign page uses createSignedUrl)
-- signed URLs bypass RLS on read, so no extra policy needed.

-- Done.
