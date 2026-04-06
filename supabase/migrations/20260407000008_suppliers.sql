-- ==============================================
-- Migration: Suppliers
-- Description: Creates the suppliers table with RLS (service_role
--              full access only). Scoped to a business via business_id FK.
-- Author: DB Migration Manager Agent
-- Date: 2026-04-07
--
-- Note: uuid_generate_v7()  loaded from 20260201000000_uuid_v7_function.sql
-- Note: handle_updated_at() loaded from 20260201000001_rbac_and_auth_system.sql
--
-- ROLLBACK (run manually if needed):
--   DROP TRIGGER IF EXISTS set_updated_at_suppliers ON public.suppliers;
--   DROP POLICY  IF EXISTS "suppliers_service_role_all" ON public.suppliers;
--   REVOKE ALL ON public.suppliers FROM service_role;
--   DROP TABLE  IF EXISTS public.suppliers;
-- ==============================================

-- ==============================================
-- STEP 1: CREATE TABLE
-- ==============================================

-- suppliers stores supplier records scoped to a business.
-- ON DELETE CASCADE on business_id: removing a business removes all its suppliers.
CREATE TABLE IF NOT EXISTS public.suppliers (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v7(),
    business_id       UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name              TEXT        NOT NULL,
    code              TEXT,
    billing_address   TEXT,
    delivery_address  TEXT,
    email             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================
-- STEP 2: INDEXES
-- ==============================================

-- business_id: primary filter for fetching all suppliers in a business
CREATE INDEX IF NOT EXISTS idx_suppliers_business_id
    ON public.suppliers (business_id);

-- email: supports lookup and search by supplier email within a business
CREATE INDEX IF NOT EXISTS idx_suppliers_email
    ON public.suppliers (email);

-- ==============================================
-- STEP 3: UPDATED_AT TRIGGER
-- ==============================================

DROP TRIGGER IF EXISTS set_updated_at_suppliers ON public.suppliers;

CREATE TRIGGER set_updated_at_suppliers
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ==============================================

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- STEP 5: RLS POLICY (service_role full access)
-- ==============================================
-- All database operations go through the FastAPI backend which uses the
-- service_role key. No direct authenticated/anon access is required.

DROP POLICY IF EXISTS "suppliers_service_role_all" ON public.suppliers;

CREATE POLICY "suppliers_service_role_all"
    ON public.suppliers FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ==============================================
-- STEP 6: GRANTS (Principle of Least Privilege)
-- ==============================================

-- Service role (FastAPI backend) needs full CRUD
GRANT ALL ON public.suppliers TO service_role;

-- anon: NO access to application tables
-- authenticated: NO direct access (all reads/writes go through FastAPI)
