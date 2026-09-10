import type { Metadata } from 'next';
import NotebookHome from '@/app/components/NotebookHome';
import { requireEditorPage } from '@/lib/editor-page-auth';
import { isSceneMode } from '@/lib/studio-preview-protocol';
import { getStudioViewportPreset } from '@/lib/studio-viewport';
import StudioPreviewBridge from './StudioPreviewBridge';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Scene Studio Preview | Day Atlas',
  robots: { index: false, follow: false },
};

export default async function StudioPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string | string[]; viewport?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const rawViewport = Array.isArray(params.viewport) ? params.viewport[0] : params.viewport;
  const mode = isSceneMode(rawMode) ? rawMode : 'edit';
  const viewport = getStudioViewportPreset(rawViewport);
  const nextPath = `/studio/preview?mode=${mode}&viewport=${viewport.id}`;

  await requireEditorPage(nextPath);

  return (
    <>
      <StudioPreviewBridge initialMode={mode} initialViewport={viewport.id} />
      <NotebookHome />
    </>
  );
}
