import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { isExplicitMaintenanceEnabled } from './maintenance';

export async function getMaintenanceEnabled(): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient()
      .from('site_settings')
      .select('maintenance_enabled')
      .eq('id', 'global')
      .maybeSingle();

    if (error) throw error;
    return isExplicitMaintenanceEnabled(data?.maintenance_enabled);
  } catch (error) {
    console.error('Stato manutenzione non disponibile, il sito resta online.', error);
    return false;
  }
}
