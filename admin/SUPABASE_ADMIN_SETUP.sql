-- ============================================================
-- Hay & Wilson Admin Panel - Supabase Database Setup
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Customers Table
CREATE TABLE hw_customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_hw_customers_name ON hw_customers(name);

-- 2. Jobs Table
CREATE TABLE hw_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES hw_customers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'invoiced', 'paid')),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_hw_jobs_customer ON hw_jobs(customer_id);
CREATE INDEX idx_hw_jobs_status ON hw_jobs(status);

-- 3. Expenses Table
CREATE TABLE hw_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES hw_jobs(id) ON DELETE CASCADE,
    vendor TEXT,
    description TEXT,
    amount NUMERIC(10,2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_path TEXT,
    ocr_raw_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_hw_expenses_job ON hw_expenses(job_id);

-- 4. Invoices Table
CREATE TABLE hw_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES hw_jobs(id) ON DELETE CASCADE,
    stripe_invoice_id TEXT,
    stripe_invoice_url TEXT,
    amount NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'paid', 'void')),
    due_date DATE,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_hw_invoices_job ON hw_invoices(job_id);
CREATE INDEX idx_hw_invoices_status ON hw_invoices(status);

-- 5. Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION hw_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hw_customers_updated BEFORE UPDATE ON hw_customers
    FOR EACH ROW EXECUTE FUNCTION hw_update_timestamp();
CREATE TRIGGER hw_jobs_updated BEFORE UPDATE ON hw_jobs
    FOR EACH ROW EXECUTE FUNCTION hw_update_timestamp();
CREATE TRIGGER hw_invoices_updated BEFORE UPDATE ON hw_invoices
    FOR EACH ROW EXECUTE FUNCTION hw_update_timestamp();

-- 6. Row Level Security - Authenticated users only
ALTER TABLE hw_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth full access" ON hw_customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE hw_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth full access" ON hw_jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE hw_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth full access" ON hw_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE hw_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth full access" ON hw_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Update existing contact messages table - add authenticated update/delete
CREATE POLICY "Auth update messages" ON hw_contact_messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete messages" ON hw_contact_messages FOR DELETE TO authenticated USING (true);

-- ============================================================
-- STORAGE BUCKET SETUP
-- Go to Supabase Dashboard > Storage > Create new bucket:
--   Name: hw-receipts
--   Public: OFF
--   File size limit: 10MB
--   Allowed MIME types: image/jpeg, image/png, image/heic, application/pdf
--
-- Then add these storage policies in SQL Editor:
-- ============================================================

-- Storage policies (run after creating the bucket)
-- INSERT policy
CREATE POLICY "Auth upload receipts" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'hw-receipts');

-- SELECT policy
CREATE POLICY "Auth view receipts" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'hw-receipts');

-- DELETE policy
CREATE POLICY "Auth delete receipts" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'hw-receipts');

-- 8. Payment Methods Table
CREATE TABLE hw_payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'credit_card'
        CHECK (type IN ('credit_card', 'debit_card', 'bank_account')),
    last4 TEXT NOT NULL,
    owner TEXT NOT NULL DEFAULT 'company'
        CHECK (owner IN ('personal', 'company')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hw_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth full access" ON hw_payment_methods FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER hw_payment_methods_updated BEFORE UPDATE ON hw_payment_methods
    FOR EACH ROW EXECUTE FUNCTION hw_update_timestamp();

-- Add payment_method_id to expenses
ALTER TABLE hw_expenses ADD COLUMN payment_method_id UUID REFERENCES hw_payment_methods(id) ON DELETE SET NULL;

-- ============================================================
-- AUTH SETUP
-- Go to Supabase Dashboard > Authentication > Users > Add User
-- Create one account with your email and a strong password
-- ============================================================
