import type { Metadata } from 'next';
import { requireEditorPage } from '@/lib/editor-page-auth';
import StudioShell from './StudioShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Scene Studio | Day Atlas',
  robots: { index: false, follow: false },
};

export default async function StudioPage() {
  await requireEditorPage('/studio');
  return <StudioShell />;
}
