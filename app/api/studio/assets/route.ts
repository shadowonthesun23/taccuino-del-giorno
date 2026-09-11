import { NextResponse } from 'next/server';
import { getEditorAuthorization } from '@/lib/editor-auth';
import { SCENE_ASSET_BUCKET, validateSceneAssetUpload } from '@/lib/scene-assets';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const authorization = await getEditorAuthorization(request);
  if (!authorization.ok) return new Response(authorization.message, { status: authorization.status });
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return new Response('File mancante.', { status: 400 });
  const validation = validateSceneAssetUpload(file);
  if (!validation.ok) return new Response(validation.error, { status: 400 });
  const assetId = crypto.randomUUID();
  const path = `${authorization.userId}/${assetId}.${validation.extension}`;
  const supabase = createAdminClient();
  const { error: uploadError } = await supabase.storage.from(SCENE_ASSET_BUCKET).upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false, cacheControl: '31536000' });
  if (uploadError) return new Response('Upload non riuscito.', { status: 500 });
  const { error: recordError } = await supabase.from('scene_assets').insert({ id: assetId, path, original_name: file.name, mime_type: file.type, byte_size: file.size, created_by: authorization.userId });
  if (recordError) {
    await supabase.storage.from(SCENE_ASSET_BUCKET).remove([path]);
    return new Response('Registrazione asset non riuscita.', { status: 500 });
  }
  return NextResponse.json({ id: `asset-${assetId}`, name: validation.name, asset: { source: 'storage', path } });
}
