-- ==============================================
-- Migration: Suspense Materialized View
-- Description: Creates a materialized view that aggregates the total
--              suspense balance per business from receipt lines where
--              account_id = 'suspense'. Refreshed after every receipt
--              write. Shown on the Balance Sheet only when non-zero.
--              Not a source of truth — purely derived from receipts.
-- Author: DB Migration Manager Agent
-- Date: 2026-04-07
--
-- ROLLBACK:
--   DROP MATERIALIZED VIEW IF EXISTS public.business_suspense_balance;
-- ==============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.business_suspense_balance AS
SELECT
    r.business_id,
    COALESCE(SUM((line->>'amount')::numeric), 0) AS suspense_balance
FROM public.receipts r,
     jsonb_array_elements(r.lines) AS line
WHERE line->>'account_id' = 'suspense'
GROUP BY r.business_id;

-- Unique index required for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_suspense_balance_business_id
    ON public.business_suspense_balance (business_id);

-- Grant read access to service_role for querying
GRANT SELECT ON public.business_suspense_balance TO service_role;
