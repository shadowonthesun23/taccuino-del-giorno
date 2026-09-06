import assert from 'node:assert/strict';
import test from 'node:test';
import { getAuthorAnniversary } from '../lib/author-metadata.ts';

test('accepts only an exact birth or death day and month', () => {
  assert.deepEqual(
    getAuthorAnniversary('2026-09-06', {
      imageUrl: null,
      birthDate: '1842-03-18',
      deathDate: '1898-09-09',
    }),
    null,
  );

  assert.deepEqual(
    getAuthorAnniversary('2026-09-06', {
      imageUrl: null,
      birthDate: '1925-09-06',
      deathDate: '2019-07-17',
    }),
    { kind: 'birth', year: '1925' },
  );

  assert.deepEqual(
    getAuthorAnniversary('2026-09-06', {
      imageUrl: null,
      birthDate: '1839-01-16',
      deathDate: '1907-09-06',
    }),
    { kind: 'death', year: '1907' },
  );
});
