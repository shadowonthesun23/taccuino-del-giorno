import assert from 'node:assert/strict';
import test from 'node:test';
import { getAuthorSocialCardLayout, splitAuthorNameForSocialCard } from '../app/lib/authorCardDesign.ts';

test('keeps short author cards airy and gives short quotes generous type', () => {
  const layout = getAuthorSocialCardLayout(
    'La libertà comincia quando smettiamo di avere paura.',
    'Scrittore e giornalista.',
    'Joseph Roth',
    true,
    '2 · IX · 2026',
  );

  assert.equal(layout.variant, 'airy');
  assert.equal(layout.nameMaxLines, 2);
  assert.equal(layout.quoteFontSize, 78);
  assert.equal(layout.quoteMaxLines, 4);
  assert.equal(layout.photoWidth, 520);
});

test('reduces density progressively for long names and long quotes', () => {
  const layout = getAuthorSocialCardLayout(
    'Una citazione molto lunga che deve rimanere leggibile anche quando il contenuto del giorno occupa molte righe e richiede una composizione più compatta, senza diventare un testo microscopico o uscire dai margini della card, mantenendo però il respiro della pagina e un’attribuzione sempre separata.',
    'Una descrizione editoriale più articolata che supera la soglia prevista e deve restare un’informazione secondaria, limitata e controllata.',
    'Gabriel García Márquez de la Serna y del mondo contemporaneo',
    true,
    '27 · XII · 2026',
  );

  assert.equal(layout.variant, 'compact');
  assert.equal(layout.nameMaxLines, 2);
  assert.ok(layout.nameFontSize < 128);
  assert.ok(layout.quoteFontSize <= 50);
  assert.equal(layout.quoteMaxLines, 10);
  assert.equal(layout.photoWidth, 474);
  assert.ok(layout.descriptionFontSize >= 30);
  assert.ok(layout.quoteTop > layout.descriptionTop);
});

test('splits social author names into two deliberate levels', () => {
  assert.deepEqual(splitAuthorNameForSocialCard('Joseph Roth'), ['Joseph', 'Roth']);
  assert.deepEqual(splitAuthorNameForSocialCard('Eduardo Galeano'), ['Eduardo', 'Galeano']);
  assert.deepEqual(splitAuthorNameForSocialCard('Gabriel García Márquez'), ['Gabriel', 'García Márquez']);
  assert.deepEqual(splitAuthorNameForSocialCard('Mononym'), ['Mononym']);
});

test('keeps missing-photo geometry deterministic while switching to initials', () => {
  const withPhoto = getAuthorSocialCardLayout('Una frase breve.', 'Poeta.', 'Ada Lovelace', true);
  const withoutPhoto = getAuthorSocialCardLayout('Una frase breve.', 'Poeta.', 'Ada Lovelace', false);

  assert.equal(withoutPhoto.photoWidth, withPhoto.photoWidth);
  assert.equal(withoutPhoto.photoHeight, withPhoto.photoHeight);
  assert.notEqual(withoutPhoto.photoAngle, withPhoto.photoAngle);
});
