import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { getConfiguredEditorUserId, isConfiguredEditorUser } from './editor-access';

type EditorAuthorizationDenied = {
  ok: false;
  status: 401 | 403 | 503;
  message: string;
};

export type EditorAuthorization =
  | { ok: true; userId: string }
  | EditorAuthorizationDenied;

function isSameOriginRequest(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function getEditorAuthorization(request?: Request): Promise<EditorAuthorization> {
  if (!getConfiguredEditorUserId()) {
    console.error('EDITOR_USER_ID non configurato: accesso editor disabilitato.');
    return { ok: false, status: 503, message: 'Area editor non configurata.' };
  }

  if (request && !isSameOriginRequest(request)) {
    return { ok: false, status: 403, message: 'Richiesta non consentita.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === 'string' ? data.claims.sub : null;

  if (error || !userId) {
    return { ok: false, status: 401, message: 'Sessione non valida.' };
  }

  if (!isConfiguredEditorUser(userId)) {
    return { ok: false, status: 403, message: 'Accesso editor negato.' };
  }

  return { ok: true, userId };
}
