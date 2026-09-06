import assert from 'node:assert/strict';
import test from 'node:test';
import { formatRecentPoemExclusions, isRecentPoemRepeat } from '../lib/poem-history.ts';

const recentSinisgalli = {
  poesia: {
    autore: 'Leonardo Sinisgalli',
    fonte: "Da 'Poesie', Mondadori, 1970",
    testo: 'Senza l’immagine che cosa sarebbe il mio spirito?',
  },
};

test('allows the same poet to return with a different poem', () => {
  assert.equal(
    isRecentPoemRepeat('Un testo completamente diverso dello stesso autore.', [recentSinisgalli]),
    false,
  );
  assert.equal(
    isRecentPoemRepeat('Senza l\'immagine che cosa sarebbe il mio spirito?', [recentSinisgalli]),
    true,
  );
});

test('lists recent poems with their source and incipit', () => {
  const exclusions = formatRecentPoemExclusions([recentSinisgalli]);
  assert.match(exclusions, /Leonardo Sinisgalli/);
  assert.match(exclusions, /incipit:/);
});
