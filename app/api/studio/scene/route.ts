import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getEditorAuthorization } from '@/lib/editor-auth';
import { validateSceneDraft } from '@/lib/scene-draft';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const authorization = await getEditorAuthorization(request);
  if (!authorization.ok) return new Response(authorization.message, { status: authorization.status });
  const supabase = createAdminClient();
  const [draftResult, publishedResult] = await Promise.all([
    supabase.from('scene_drafts').select('scene').eq('scene_id', 'home').maybeSingle(),
    supabase.from('scene_published').select('scene').eq('scene_id', 'home').maybeSingle(),
  ]);
  if (draftResult.error || publishedResult.error) return new Response('Errore caricamento scena.', { status: 500 });
  return NextResponse.json({ draft: draftResult.data?.scene ?? null, published: publishedResult.data?.scene ?? null });
}

export async function PUT(request: Request) {
  const authorization = await getEditorAuthorization(request);
  if (!authorization.ok) return new Response(authorization.message, { status: authorization.status });
  const validation = validateSceneDraft(await request.json().catch(() => null));
  if (!validation.ok) return NextResponse.json({ error: 'Scena non valida.', issues: validation.issues }, { status: 400 });
  const { error } = await createAdminClient().from('scene_drafts').upsert({ scene_id: 'home', scene: validation.value, updated_by: authorization.userId, updated_at: new Date().toISOString() }, { onConflict: 'scene_id' });
  if (error) return new Response('Errore salvataggio bozza.', { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const authorization = await getEditorAuthorization(request);
  if (!authorization.ok) return new Response(authorization.message, { status: authorization.status });
  const validation = validateSceneDraft(await request.json().catch(() => null));
  if (!validation.ok) return NextResponse.json({ error: 'Scena non valida.', issues: validation.issues }, { status: 400 });
  const { error } = await createAdminClient().from('scene_published').upsert({ scene_id: 'home', scene: validation.value, published_by: authorization.userId, published_at: new Date().toISOString() }, { onConflict: 'scene_id' });
  if (error) return new Response('Errore pubblicazione scena.', { status: 500 });
  revalidatePath('/');
  return NextResponse.json({ ok: true, scene: validation.value });
}
