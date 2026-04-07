-- ==============================================
-- Migration: Business UI Preferences
-- Description: Creates the business_ui_preferences table with RLS
--              (service_role full access only). Stores per-business UI
--              preferences such as visible columns in list views.
--              One row per business (UNIQUE business_id).
-- Author: DB Migration Manager Agent
-- Date: 2026-04-07
--
-- Note: uuid_generate_v7()  loaded from 20260201000000_uuid_v7_function.sql
-- Note: handle_updated_at() loaded from 20260201000001_rbac_and_auth_system.sql
--
-- ROLLBACK (run manually if needed):
--   DROP TRIGGER IF EXISTS set_updated_at_business_ui_preferences ON public.business_ui_preferences;
--   DROP POLICY  IF EXISTS "business_ui_preferences_service_role_all" ON public.business_ui_preferences;
--   REVOKE ALL ON public.business_ui_preferences FROM service_role;
--   DROP TABLE  IF EXISTS public.business_ui_preferences;
-- ==============================================

-- ==============================================
-- STEP 1: CREATE TABLE
-- ==============================================

-- business_ui_preferences stores UI display settings scoped to a business.
-- ON DELETE CASCADE on business_id: removing a business removes its preferences.
-- UNIQUE business_id: one preferences row per business.
-- tab_columns: JSONB map of { "<tab_key>": ["col1","col2",...] } for all tabs.
CREATE TABLE IF NOT EXISTS public.business_ui_preferences (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v7(),
    business_id         UUID        NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
    tab_columns         JSONB       NOT NULL DEFAULT '{}'::jsonb,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================
-- STEP 2: INDEXES
-- ==============================================

-- business_id: primary lookup key (also covered by UNIQUE constraint index,
-- but an explicit named index makes intent clear and supports query planning)
CREATE INDEX IF NOT EXISTS idx_business_ui_preferences_business_id
    ON public.business_ui_preferences (business_id);

-- ==============================================
-- STEP 3: UPDATED_AT TRIGGER
-- ==============================================

DROP TRIGGER IF EXISTS set_updated_at_business_ui_preferences ON public.business_ui_preferences;

CREATE TRIGGER set_updated_at_business_ui_preferences
    BEFORE UPDATE ON public.business_ui_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ==============================================

ALTER TABLE public.business_ui_preferences ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- STEP 5: RLS POLICY (service_role full access)
-- ==============================================
-- All database operations go through the FastAPI backend which uses the
-- service_role key. No direct authenticated/anon access is required.

DROP POLICY IF EXISTS "business_ui_preferences_service_role_all" ON public.business_ui_preferences;

CREATE POLICY "business_ui_preferences_service_role_all"
    ON public.business_ui_preferences FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ==============================================
-- STEP 6: GRANTS (Principle of Least Privilege)
-- ==============================================

-- Service role (FastAPI backend) needs full CRUD
GRANT ALL ON public.business_ui_preferences TO service_role;

-- anon: NO access to application tables
-- authenticated: NO direct access (all reads/writes go through FastAPI)
