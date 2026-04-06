-- ============================================
-- Migration: Backfill is_fixed for seeded COA records
-- Description: Sets is_fixed = TRUE on the system-seeded COA groups and
--              accounts that were created before the is_fixed flag existed.
--              These records are immutable by business logic (backend returns
--              HTTP 403 on edit/delete; frontend hides Edit/Delete buttons).
--              Because the column was added with DEFAULT FALSE all existing
--              rows got is_fixed = FALSE, causing incorrect Edit/Delete
--              buttons to appear for pre-existing businesses.
-- Author: DB Migration Manager Agent
-- Date: 2026-04-07
-- ============================================

-- Section 1: Backfill coa_groups
-- The three top-level balance-sheet groups are seeded automatically for every
-- new business and must never be renamed or deleted.
UPDATE public.coa_groups
SET is_fixed = TRUE
WHERE name IN ('Assets', 'Liabilities', 'Equity')
  AND type = 'balance_sheet'
  AND is_fixed = FALSE;

-- Section 2: Backfill coa_accounts
-- Retained Earnings is a required balance-sheet account seeded per business.
UPDATE public.coa_accounts
SET is_fixed = TRUE
WHERE name = 'Retained Earnings'
  AND type = 'balance_sheet'
  AND is_fixed = FALSE;

-- Net Profit (Loss) is the P&L summary total row, always seeded and read-only.
UPDATE public.coa_accounts
SET is_fixed = TRUE
WHERE name = 'Net Profit (Loss)'
  AND type = 'pl'
  AND is_total = TRUE
  AND is_fixed = FALSE;

-- Rollback:
-- UPDATE public.coa_groups  SET is_fixed = FALSE WHERE name IN ('Assets', 'Liabilities', 'Equity') AND type = 'balance_sheet';
-- UPDATE public.coa_accounts SET is_fixed = FALSE WHERE name = 'Retained Earnings' AND type = 'balance_sheet';
-- UPDATE public.coa_accounts SET is_fixed = FALSE WHERE name = 'Net Profit (Loss)' AND type = 'pl' AND is_total = TRUE;
