-- Backfill business_tabs.label from admin_tabs where they diverged (stale key-as-label)
-- Rollback: no structural changes; labels can be re-synced from admin_tabs at any time

UPDATE business_tabs bt
SET label = at.label
FROM admin_tabs at
WHERE bt.key = at.key
  AND bt.label != at.label;
