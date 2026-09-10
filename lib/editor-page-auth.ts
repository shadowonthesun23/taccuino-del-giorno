import 'server-only';

import { redirect } from 'next/navigation';
import { getEditorAuthorization } from './editor-auth';

export async function requireEditorPage(nextPath: string) {
  const authorization = await getEditorAuthorization();
  if (!authorization.ok) {
    const params = new URLSearchParams({ next: nextPath });
    redirect(`/login?${params.toString()}`);
  }
  return authorization;
}
