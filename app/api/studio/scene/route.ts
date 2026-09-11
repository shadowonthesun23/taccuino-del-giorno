import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getEditorAuthorization } from '@/lib/editor-auth';
import { validateSceneDraft } from '@/lib/scene-draft';
import { HOME_SCENE_DRAFT_BASELINE_V1 } from '@/lib/scene-draft-editor';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const authorization = await getEditorAuthorization(request);
  if (!authorization.ok) return new Response(authorization.message, { status: authorization.status });
  const supabase = createAdminClient();
  const baseline = await supabase.rpc('ensure_scene_baseline', { p_scene_id: 'home', p_scene: HOME_SCENE_DRAFT_BASELINE_V1, p_user_id: authorization.userId });
  if (baseline.error) return new Response('Errore inizializzazione cronologia.', { status: 500 });
  const [draftResult, publishedResult] = await Promise.all([
    supabase.from('scene_drafts').select('scene').eq('scene_id', 'home').maybeSingle(),
    supabase.from('scene_published').select('scene').eq('scene_id', 'home').maybeSingle(),
  ]);
  const versionsResult = await supabase.from('scene_versions').select('id, scene_id, version_number, label, scene, is_baseline, is_current, source_version_id, created_at').eq('scene_id', 'home').order('version_number', { ascending: false });
  if (draftResult.error || publishedResult.error || versionsResult.error) return new Response('Errore caricamento scena.', { status: 500 });
  return NextResponse.json({ draft: draftResult.data?.scene ?? null, published: publishedResult.data?.scene ?? null, versions: versionsResult.data ?? [] });
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
  const body = await request.json().catch(() => null) as { action?: unknown; scene?: unknown; sourceVersionId?: unknown } | null;
  const action = body?.action === 'rollback' ? 'rollback' : 'publish';
  const supabase = createAdminClient();
  let sourceVersionId: string | null = null;
  let label = 'Pubblicazione';
  let validation = validateSceneDraft(action === 'rollback' ? body?.scene : body);
  if (action === 'rollback') {
    if (typeof body?.sourceVersionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.sourceVersionId)) return NextResponse.json({ error: 'Versione sorgente non valida.' }, { status: 400 });
    const source = await supabase.from('scene_versions').select('id, version_number, scene').eq('scene_id', 'home').eq('id', body.sourceVersionId).maybeSingle();
    if (source.error || !source.data) return NextResponse.json({ error: 'Versione non trovata.' }, { status: 404 });
    const sourceValidation = validateSceneDraft(source.data.scene);
    if (!sourceValidation.ok) return NextResponse.json({ error: 'Snapshot sorgente non valida.' }, { status: 400 });
    validation = sourceValidation;
    sourceVersionId = source.data.id;
    label = `Ripristino di v${source.data.version_number}`;
  }
  if (!validation.ok) return NextResponse.json({ error: 'Scena non valida.', issues: validation.issues }, { status: 400 });
  const { data, error } = await supabase.rpc('publish_scene_version', {
    p_scene_id: 'home',
    p_scene: validation.value,
    p_user_id: authorization.userId,
    p_label: label,
    p_source_version_id: sourceVersionId,
  });
  if (error || !data) return new Response(action === 'rollback' ? 'Errore ripristino scena.' : 'Errore pubblicazione scena.', { status: 500 });
  revalidatePath('/');
  const version = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ ok: true, scene: validation.value, version });
}
