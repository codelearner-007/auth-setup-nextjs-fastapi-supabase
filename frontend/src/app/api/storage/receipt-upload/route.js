import { NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { enforceSameOrigin } from '@/lib/utils/origin';

const MAX_FILE_SIZE = 20971520; // 20 MB
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

export async function POST(request) {
  const originError = enforceSameOrigin(request);
  if (originError) return originError;

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const businessId = formData.get('businessId');
  if (!businessId || typeof businessId !== 'string') {
    return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File exceeds 20 MB limit' }, { status: 413 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'File type not allowed. Accepted: JPEG, PNG, WebP, GIF, PDF' },
      { status: 415 },
    );
  }

  const path = `${businessId}/${Date.now()}-${file.name}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const supabase = await createServerAdminClient();
  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(path, fileBuffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path);

  return NextResponse.json({ url: urlData.publicUrl });
}
