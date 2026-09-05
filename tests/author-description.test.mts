import assert from 'node:assert/strict';
import test from 'node:test';

const authorDescriptionModule = '../lib/author-description.ts';
const { getAuthorTeaser, sanitizeAuthorDescription } = await import(authorDescriptionModule);

test('removes legacy editorial-selection prefixes only at the start', () => {
  const prefix = ['Scelta', 'editoriale'].join(' ');

  assert.equal(sanitizeAuthorDescription(`${prefix}: scrittore e giornalista.`), 'scrittore e giornalista.');
  assert.equal(sanitizeAuthorDescription(`${prefix.toUpperCase()} — scrittore e giornalista.`), 'scrittore e giornalista.');
  assert.equal(sanitizeAuthorDescription(`${prefix} - scrittore e giornalista.`), 'scrittore e giornalista.');
  assert.equal(
    sanitizeAuthorDescription(`Una frase normale che cita ${prefix}: senza usarlo come prefisso.`),
    `Una frase normale che cita ${prefix}: senza usarlo come prefisso.`,
  );
});

test('gives the live author teaser more room without fabricating a full stop', () => {
  const longDescription = `${'Una descrizione biografica abbastanza ampia per verificare il limite della tavola '.repeat(5).trim()}. Seconda frase.`;
  const teaser = getAuthorTeaser(longDescription, 210);

  assert.ok(teaser.length <= 211);
  assert.ok(teaser.endsWith('…'));
  assert.ok(!teaser.endsWith('.'));
});
