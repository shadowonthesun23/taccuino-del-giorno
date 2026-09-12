import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  MAINTENANCE_COPY,
  PUBLIC_HOME_PATHS,
  isExplicitMaintenanceEnabled,
  isMaintenanceTogglePayload,
  maintenanceSettingsWrite,
} from '../lib/maintenance.ts';

test('maintenance false and an unreadable value fail open to the ordinary public home', () => {
  assert.equal(isExplicitMaintenanceEnabled(false), false);
  assert.equal(isExplicitMaintenanceEnabled(undefined), false);
  assert.equal(isExplicitMaintenanceEnabled(new Error('Supabase unavailable')), false);
});

test('maintenance is shown only for an explicitly persisted true value', () => {
  assert.equal(isExplicitMaintenanceEnabled(true), true);
});

test('maintenance copy is selected for every public language', () => {
  assert.deepEqual(PUBLIC_HOME_PATHS, ['/', '/en', '/es', '/fr', '/de']);
  assert.equal(MAINTENANCE_COPY.IT.title, 'Il giorno è momentaneamente sul tavolo da lavoro.');
  assert.equal(MAINTENANCE_COPY.EN.title, 'The day is briefly on the workbench.');
  assert.equal(MAINTENANCE_COPY.ES.title, 'El día está un momento sobre la mesa de trabajo.');
  assert.equal(MAINTENANCE_COPY.FR.title, 'Le jour est momentanément sur la table de travail.');
  assert.equal(MAINTENANCE_COPY.DE.title, 'Der Tag liegt gerade kurz auf dem Arbeitstisch.');
});

test('each public home makes the server-side maintenance decision before rendering NotebookHome', () => {
  const pages = [
    ['../app/page.tsx', 'IT'],
    ['../app/en/page.tsx', 'EN'],
    ['../app/es/page.tsx', 'ES'],
    ['../app/fr/page.tsx', 'FR'],
    ['../app/de/page.tsx', 'DE'],
  ] as const;

  for (const [path, locale] of pages) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.match(source, /getMaintenanceEnabled/);
    assert.match(source, new RegExp(`if \\(await getMaintenanceEnabled\\(\\)\\) return <MaintenanceScreen locale="${locale}"`));
    assert.ok(source.indexOf('getMaintenanceEnabled') < source.indexOf('<NotebookHome'));
  }
});

test('the maintenance endpoint accepts only the single boolean control and writes no editorial or scene data', () => {
  assert.equal(isMaintenanceTogglePayload({ maintenance_enabled: true }), true);
  assert.equal(isMaintenanceTogglePayload({ maintenance_enabled: 'true' }), false);
  assert.equal(isMaintenanceTogglePayload({ maintenance_enabled: false, date: '2026-09-12' }), false);
  assert.deepEqual(maintenanceSettingsWrite(true), { id: 'global', maintenance_enabled: true });
  assert.deepEqual(maintenanceSettingsWrite(false), { id: 'global', maintenance_enabled: false });
});

test('the maintenance endpoint uses the established editor authorization boundary before either read or write', () => {
  const source = readFileSync(new URL('../app/api/site-status/route.ts', import.meta.url), 'utf8');
  assert.match(source, /import \{ getEditorAuthorization \} from '@\/lib\/editor-auth';/);
  assert.match(source, /const authorization = await requireEditor\(request\);/);
  assert.match(source, /export async function GET/);
  assert.match(source, /export async function PUT/);
});
