export const PUBLIC_HOME_PATHS = ['/', '/en', '/es', '/fr', '/de'] as const;

export type MaintenanceLocale = 'IT' | 'EN' | 'ES' | 'FR' | 'DE';

export const MAINTENANCE_COPY: Record<MaintenanceLocale, { title: string; body: string }> = {
  IT: {
    title: 'Il giorno è momentaneamente sul tavolo da lavoro.',
    body: 'Sto sistemando qualche pagina, raddrizzando un paio di dettagli e rimettendo tutto al suo posto.\nTorna fra poco: non dovrebbe volerci molto.',
  },
  EN: {
    title: 'The day is briefly on the workbench.',
    body: 'I’m tidying up a few pages, straightening out a couple of details, and putting everything back in its place.\nCome back soon — it shouldn’t take long.',
  },
  ES: {
    title: 'El día está un momento sobre la mesa de trabajo.',
    body: 'Estoy poniendo en orden algunas páginas, corrigiendo un par de detalles y dejando cada cosa en su sitio.\nVuelve dentro de poco: no debería tardar mucho.',
  },
  FR: {
    title: 'Le jour est momentanément sur la table de travail.',
    body: 'Je remets quelques pages en ordre, corrige deux ou trois détails et replace chaque chose à sa place.\nRevenez dans un petit moment : cela ne devrait pas être long.',
  },
  DE: {
    title: 'Der Tag liegt gerade kurz auf dem Arbeitstisch.',
    body: 'Ich bringe ein paar Seiten in Ordnung, richte ein paar Details und lege alles wieder an seinen Platz.\nSchau bald wieder vorbei – es sollte nicht lange dauern.',
  },
};

export function isMaintenanceTogglePayload(value: unknown): value is { maintenance_enabled: boolean } {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && Object.keys(value).length === 1
    && typeof (value as Record<string, unknown>).maintenance_enabled === 'boolean';
}

export function isExplicitMaintenanceEnabled(value: unknown): boolean {
  return value === true;
}

export function maintenanceSettingsWrite(maintenanceEnabled: boolean) {
  return { id: 'global', maintenance_enabled: maintenanceEnabled };
}
