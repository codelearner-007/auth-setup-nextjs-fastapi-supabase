-- ==============================================
-- Migration: Receipts
-- Description: Creates the receipts table with RLS (service_role
--              full access only). Scoped to a business via business_id FK.
--              Stores receipt header data plus line items as JSONB.
-- Author: DB Migration Manager Agent
-- Date: 2026-04-07
--
-- Note: uuid_generate_v7()  loaded from 20260201000000_uuid_v7_function.sql
-- Note: handle_updated_at() loaded from 20260201000001_rbac_and_auth_system.sql
--
-- ROLLBACK (run manually if needed):
--   DROP TRIGGER IF EXISTS set_updated_at_receipts ON public.receipts;
--   DROP POLICY  IF EXISTS "receipts_service_role_all" ON public.receipts;
--   REVOKE ALL ON public.receipts FROM service_role;
--   DROP TABLE  IF EXISTS public.receipts;
-- ==============================================

-- ==============================================
-- STEP 1: CREATE TABLE
-- ==============================================

-- receipts stores receipt records scoped to a business.
-- ON DELETE CASCADE on business_id: removing a business removes all its receipts.
-- paid_by_type: 'Contact' (linked to a customer or supplier) or 'Other' (free-text name).
-- paid_by_contact_type: 'customer' or 'supplier' — discriminates which table paid_by_contact_id references.
-- lines: JSONB array of line items [{account_id, amount, total}].
CREATE TABLE IF NOT EXISTS public.receipts (
    id                          UUID        PRIMARY KEY DEFAULT uuid_generate_v7(),
    business_id                 UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    date                        DATE        NOT NULL DEFAULT CURRENT_DATE,
    reference                   TEXT,
    paid_by_type                TEXT        NOT NULL DEFAULT 'Contact',
    paid_by_contact_id          UUID,
    paid_by_contact_type        TEXT,
    paid_by_other               TEXT,
    received_in_account_id      UUID        REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
    description                 TEXT,
    lines                       JSONB       NOT NULL DEFAULT '[]'::jsonb,
    show_line_number            BOOLEAN     NOT NULL DEFAULT FALSE,
    show_description            BOOLEAN     NOT NULL DEFAULT FALSE,
    show_qty                    BOOLEAN     NOT NULL DEFAULT FALSE,
    show_discount               BOOLEAN     NOT NULL DEFAULT FALSE,
    image_url                   TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================
-- STEP 2: INDEXES
-- ==============================================

-- business_id: primary filter for fetching all receipts in a business
CREATE INDEX IF NOT EXISTS idx_receipts_business_id
    ON public.receipts (business_id);

-- date: supports chronological listing and date-range filtering
CREATE INDEX IF NOT EXISTS idx_receipts_date
    ON public.receipts (date);

-- paid_by_contact_id: supports filtering receipts by contact (customer or supplier)
CREATE INDEX IF NOT EXISTS idx_receipts_paid_by_contact_id
    ON public.receipts (paid_by_contact_id);

-- paid_by_contact_type: supports filtering by contact type ('customer' / 'supplier')
CREATE INDEX IF NOT EXISTS idx_receipts_paid_by_contact_type
    ON public.receipts (paid_by_contact_type);

-- received_in_account_id: supports filtering receipts by bank account
CREATE INDEX IF NOT EXISTS idx_receipts_received_in_account_id
    ON public.receipts (received_in_account_id);

-- ==============================================
-- STEP 3: UPDATED_AT TRIGGER
-- ==============================================

DROP TRIGGER IF EXISTS set_updated_at_receipts ON public.receipts;

CREATE TRIGGER set_updated_at_receipts
    BEFORE UPDATE ON public.receipts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ==============================================

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- STEP 5: RLS POLICY (service_role full access)
-- ==============================================
-- All database operations go through the FastAPI backend which uses the
-- service_role key. No direct authenticated/anon access is required.

DROP POLICY IF EXISTS "receipts_service_role_all" ON public.receipts;

CREATE POLICY "receipts_service_role_all"
    ON public.receipts FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ==============================================
-- STEP 6: GRANTS (Principle of Least Privilege)
-- ==============================================

-- Service role (FastAPI backend) needs full CRUD
GRANT ALL ON public.receipts TO service_role;

-- anon: NO access to application tables
-- authenticated: NO direct access (all reads/writes go through FastAPI)
