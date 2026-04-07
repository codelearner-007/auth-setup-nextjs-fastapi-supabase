-- ============================================
-- Migration: Receipt Attachments Storage Bucket
-- Description: Creates a private Supabase Storage bucket for receipt
--              attachments (images + PDFs) with service_role-only access.
-- Author: DB Migration Manager Agent
-- Date: 2026-04-07
-- ============================================

-- ============================================
-- Section 1: Create Storage Bucket
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'receipts',
    'receipts',
    false,
    20971520,   -- 20 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Section 2: RLS Policies on storage.objects
-- ============================================

-- Only service_role may access objects in the receipts bucket.
-- anon and authenticated roles have no access — all uploads and downloads
-- are proxied through the FastAPI backend, which runs as service_role.

CREATE POLICY "receipts_bucket_service_role_all"
    ON storage.objects
    FOR ALL
    TO service_role
    USING (bucket_id = 'receipts')
    WITH CHECK (bucket_id = 'receipts');

-- ============================================
-- Rollback Instructions
-- ============================================
-- To reverse this migration:
--
--   DROP POLICY IF EXISTS "receipts_bucket_service_role_all" ON storage.objects;
--   DELETE FROM storage.buckets WHERE id = 'receipts';
--
-- WARNING: Deleting the bucket will also remove all stored objects.
-- Ensure all files are backed up or migrated before rolling back.
