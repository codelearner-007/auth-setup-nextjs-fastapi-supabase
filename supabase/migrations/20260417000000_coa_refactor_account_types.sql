-- ============================================================
-- Migration: COA refactor — align with dev-roadmap.md spec
-- Changes:
--   coa_accounts.type   → asset|liability|equity|income|expense|total
--   is_total removed    → absorbed into type='total'
--   is_fixed renamed    → is_system (on both tables)
--   order_index renamed → sort_order (on both tables)
--   description, is_active, parent_id added to coa_accounts
-- Date: 2026-04-17
-- ============================================================

-- STEP 1: Add temp column, migrate existing type values
ALTER TABLE public.coa_accounts ADD COLUMN new_type TEXT;

-- balance_sheet accounts → infer from group name
UPDATE public.coa_accounts a
SET new_type = CASE
  WHEN g.name = 'Assets'      THEN 'asset'
  WHEN g.name = 'Liabilities' THEN 'liability'
  WHEN g.name = 'Equity'      THEN 'equity'
  ELSE 'asset'
END
FROM public.coa_groups g
WHERE a.group_id = g.id AND a.type = 'balance_sheet';

-- ungrouped balance_sheet → asset
UPDATE public.coa_accounts
SET new_type = 'asset'
WHERE type = 'balance_sheet' AND group_id IS NULL AND new_type IS NULL;

-- pl + is_total → total
UPDATE public.coa_accounts
SET new_type = 'total'
WHERE type = 'pl' AND is_total = TRUE;

-- remaining pl → income
UPDATE public.coa_accounts
SET new_type = 'income'
WHERE type = 'pl' AND new_type IS NULL;

-- STEP 2: Swap type column
ALTER TABLE public.coa_accounts DROP COLUMN type;
ALTER TABLE public.coa_accounts RENAME COLUMN new_type TO type;
ALTER TABLE public.coa_accounts ALTER COLUMN type SET NOT NULL;
ALTER TABLE public.coa_accounts ALTER COLUMN type SET DEFAULT 'income';

-- STEP 3: Drop is_total (absorbed into type='total')
ALTER TABLE public.coa_accounts DROP COLUMN IF EXISTS is_total;

-- STEP 4: Rename is_fixed → is_system on coa_accounts
ALTER TABLE public.coa_accounts RENAME COLUMN is_fixed TO is_system;

-- STEP 5: Rename is_fixed → is_system on coa_groups
ALTER TABLE public.coa_groups RENAME COLUMN is_fixed TO is_system;

-- STEP 6: Rename order_index → sort_order on both tables
ALTER TABLE public.coa_accounts RENAME COLUMN order_index TO sort_order;
ALTER TABLE public.coa_groups   RENAME COLUMN order_index TO sort_order;

-- STEP 7: Add missing columns to coa_accounts
ALTER TABLE public.coa_accounts
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS parent_id   UUID REFERENCES public.coa_accounts(id) ON DELETE SET NULL;

-- STEP 8: Update indexes
DROP INDEX IF EXISTS idx_coa_accounts_type;
DROP INDEX IF EXISTS idx_coa_accounts_is_fixed;
CREATE INDEX idx_coa_accounts_type       ON public.coa_accounts(type);
CREATE INDEX idx_coa_accounts_is_system  ON public.coa_accounts(is_system);
CREATE INDEX idx_coa_accounts_is_active  ON public.coa_accounts(is_active);
CREATE INDEX idx_coa_accounts_parent_id  ON public.coa_accounts(parent_id);
CREATE INDEX idx_coa_accounts_sort_order ON public.coa_accounts(sort_order);
CREATE INDEX idx_coa_groups_sort_order   ON public.coa_groups(sort_order);

-- Rollback (for reference):
-- DROP INDEX IF EXISTS idx_coa_accounts_type, idx_coa_accounts_is_system, etc.;
-- ALTER TABLE public.coa_accounts RENAME COLUMN sort_order TO order_index;
-- ALTER TABLE public.coa_groups   RENAME COLUMN sort_order TO order_index;
-- ALTER TABLE public.coa_accounts RENAME COLUMN is_system TO is_fixed;
-- ALTER TABLE public.coa_groups   RENAME COLUMN is_system TO is_fixed;
-- ALTER TABLE public.coa_accounts ADD COLUMN is_total BOOLEAN NOT NULL DEFAULT FALSE;
-- ALTER TABLE public.coa_accounts DROP COLUMN description, DROP COLUMN is_active, DROP COLUMN parent_id;
-- (type migration reversal requires manual remapping)
