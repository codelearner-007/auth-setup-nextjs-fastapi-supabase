-- Add 'receipt' admin tab so it appears in the business shell sidebar.
-- Rollback: DELETE FROM public.admin_tabs WHERE key = 'receipt';

INSERT INTO public.admin_tabs (key, label, enabled, order_index)
VALUES ('receipt', 'Receipt', TRUE, 6)
ON CONFLICT (key) DO NOTHING;
