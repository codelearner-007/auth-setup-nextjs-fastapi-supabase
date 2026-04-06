-- Add 'suppliers' admin tab so it appears in the business shell sidebar.
-- Rollback: DELETE FROM public.admin_tabs WHERE key = 'suppliers';

INSERT INTO public.admin_tabs (key, label, enabled, order_index)
VALUES ('suppliers', 'Suppliers', TRUE, 5)
ON CONFLICT (key) DO NOTHING;
