import test from 'node:test';
import assert from 'node:assert/strict';
import { truncateTitleAtWords } from '../lib/text-utils.ts';

test('keeps artwork titles at or below the word limit intact', () => {
  assert.equal(truncateTitleAtWords('Ritratto di una giovane donna con libro'), 'Ritratto di una giovane donna con libro');
});

test('truncates long titles after seven words and adds an ellipsis', () => {
  assert.equal(
    truncateTitleAtWords('Ritratto di una giovane donna con libro e paesaggio'),
    'Ritratto di una giovane donna con libro…',
  );
});

test('normalizes whitespace before counting words', () => {
  assert.equal(
    truncateTitleAtWords('  Studio\n  di   una figura   seduta   in   giardino  ', 6),
    'Studio di una figura seduta in…',
  );
});
