import assert from 'node:assert/strict';
import test from 'node:test';

const authorDescriptionModule = '../lib/author-description.ts';
const { sanitizeAuthorDescription } = await import(authorDescriptionModule);

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
