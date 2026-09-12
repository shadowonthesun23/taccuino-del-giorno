import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getEditorAuthorization } from '@/lib/editor-auth';
import { isExplicitMaintenanceEnabled, isMaintenanceTogglePayload, maintenanceSettingsWrite, PUBLIC_HOME_PATHS } from '@/lib/maintenance';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireEditor(request: Request) {
  const authorization = await getEditorAuthorization(request);
  if (!authorization.ok) return new Response(authorization.message, { status: authorization.status });
  return authorization;
}

export async function GET(request: Request) {
  const authorization = await requireEditor(request);
  if (authorization instanceof Response) return authorization;

  const { data, error } = await createAdminClient()
    .from('site_settings')
    .select('maintenance_enabled')
    .eq('id', 'global')
    .maybeSingle();

  if (error) return new Response('Impossibile leggere lo stato del sito.', { status: 500 });
  return NextResponse.json({ maintenance_enabled: isExplicitMaintenanceEnabled(data?.maintenance_enabled) });
}

export async function PUT(request: Request) {
  const authorization = await requireEditor(request);
  if (authorization instanceof Response) return authorization;

  const payload = await request.json().catch(() => null);
  if (!isMaintenanceTogglePayload(payload)) {
    return new Response('Payload non valido.', { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from('site_settings')
    .upsert(maintenanceSettingsWrite(payload.maintenance_enabled), { onConflict: 'id' })
    .select('maintenance_enabled')
    .single();

  if (error) return new Response('Impossibile aggiornare lo stato del sito.', { status: 500 });

  for (const path of PUBLIC_HOME_PATHS) revalidatePath(path);
  return NextResponse.json({ maintenance_enabled: isExplicitMaintenanceEnabled(data.maintenance_enabled) });
}
