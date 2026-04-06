-- ============================================
-- Migration: Add type and is_total to coa_accounts
-- Description: Tracks which COA panel an account belongs to (balance_sheet/pl)
--              and marks display-only total rows.
-- Author: DB Migration Manager Agent
-- Date: 2026-04-07
-- ============================================

-- Add columns
ALTER TABLE public.coa_accounts
  ADD COLUMN IF NOT EXISTS type      TEXT    NOT NULL DEFAULT 'pl',
  ADD COLUMN IF NOT EXISTS is_total  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_fixed  BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for panel filtering
CREATE INDEX IF NOT EXISTS idx_coa_accounts_type     ON public.coa_accounts(type);
CREATE INDEX IF NOT EXISTS idx_coa_accounts_is_fixed ON public.coa_accounts(is_fixed);

-- Rollback:
-- ALTER TABLE public.coa_accounts DROP COLUMN IF EXISTS type, DROP COLUMN IF EXISTS is_total, DROP COLUMN IF EXISTS is_fixed;
-- DROP INDEX IF EXISTS idx_coa_accounts_type;
-- DROP INDEX IF EXISTS idx_coa_accounts_is_fixed;
