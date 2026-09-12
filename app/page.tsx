import NotebookHome from './components/NotebookHome';
import MaintenanceScreen from './components/MaintenanceScreen';
import { getMaintenanceEnabled } from '@/lib/maintenance-server';
import { getPublishedHomeScene } from '@/lib/scene-published-server';

export const revalidate = 300;

export default async function Page() {
  if (await getMaintenanceEnabled()) return <MaintenanceScreen locale="IT" />;
  const sceneDraft = await getPublishedHomeScene();
  return <NotebookHome sceneDraft={sceneDraft ?? undefined} />;
}
