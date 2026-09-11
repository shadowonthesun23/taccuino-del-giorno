import NotebookHome from './components/NotebookHome';
import { getPublishedHomeScene } from '@/lib/scene-published-server';

export const revalidate = 300;

export default async function Page() {
  const sceneDraft = await getPublishedHomeScene();
  return <NotebookHome sceneDraft={sceneDraft ?? undefined} />;
}
