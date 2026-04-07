-- ==============================================
-- Migration: Business Tab Columns
-- Description: Drops the denormalized business_ui_preferences table (JSONB blob)
--              and replaces it with business_tab_columns where each column
--              registration is its own row (properly normalized to 3NF).
-- Author: DB Migration Manager Agent
-- Date: 2026-04-07
--
-- Note: uuid_generate_v7() loaded from 20260201000000_uuid_v7_function.sql
--
-- ROLLBACK (run manually if needed):
--   DROP POLICY  IF EXISTS "business_tab_columns_service_role_all" ON public.business_tab_columns;
--   REVOKE ALL ON public.business_tab_columns FROM service_role;
--   DROP TABLE   IF EXISTS public.business_tab_columns;
-- ==============================================

-- ==============================================
-- STEP 1: DROP OLD DENORMALIZED TABLE
-- ==============================================

-- business_ui_preferences stored all column visibility state in a single JSONB
-- blob per business. Replaced by the normalized business_tab_columns table below.
DROP TABLE IF EXISTS public.business_ui_preferences;

-- ==============================================
-- STEP 2: CREATE TABLE
-- ==============================================

-- business_tab_columns stores one row per (business, tab, column) triple.
-- ON DELETE CASCADE on business_id: removing a business removes all its column prefs.
-- UNIQUE (business_id, tab_key, col_key): prevents duplicate registrations.
-- No updated_at column — this table is insert/upsert only; no partial updates needed.
CREATE TABLE IF NOT EXISTS public.business_tab_columns (
    id          UUID    PRIMARY KEY DEFAULT uuid_generate_v7(),
    business_id UUID    NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    tab_key     TEXT    NOT NULL,
    col_key     TEXT    NOT NULL,
    visible     BOOLEAN NOT NULL DEFAULT true,
    order_index INTEGER NOT NULL DEFAULT 0,
    UNIQUE (business_id, tab_key, col_key)
);

-- ==============================================
-- STEP 3: INDEXES
-- ==============================================

-- (business_id, tab_key): primary query pattern — fetch all columns for a given
-- business and tab in a single index scan.
CREATE INDEX IF NOT EXISTS idx_business_tab_columns_lookup
    ON public.business_tab_columns (business_id, tab_key);

-- ==============================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ==============================================

ALTER TABLE public.business_tab_columns ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- STEP 5: RLS POLICY (service_role full access)
-- ==============================================
-- All database operations go through the FastAPI backend which uses the
-- service_role key. No direct authenticated/anon access is required.

DROP POLICY IF EXISTS "business_tab_columns_service_role_all" ON public.business_tab_columns;

CREATE POLICY "business_tab_columns_service_role_all"
    ON public.business_tab_columns FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ==============================================
-- STEP 6: GRANTS (Principle of Least Privilege)
-- ==============================================

-- Service role (FastAPI backend) needs full CRUD
GRANT ALL ON public.business_tab_columns TO service_role;

-- anon: NO access to application tables
-- authenticated: NO direct access (all reads/writes go through FastAPI)
