import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import { resolvePublishedScene } from './scene-publication';

export async function getPublishedHomeScene() {
  try {
    const { url, key } = getSupabasePublicConfig();
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.from('scene_published').select('scene').eq('scene_id', 'home').maybeSingle();
    if (error) throw error;
    return resolvePublishedScene(data?.scene);
  } catch (error) {
    console.error('Scena pubblicata non disponibile, uso Baseline locale.', error);
    return null;
  }
}
