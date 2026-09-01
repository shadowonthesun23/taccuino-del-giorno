import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyEditorialContentOverrides,
  sanitizeEditorialContentOverrides,
} from '../lib/editorial-content.ts';

test('clears the generated source when a quote is overridden without a replacement source', () => {
  const overrides = sanitizeEditorialContentOverrides({
    citazione: {
      testo: 'Una citazione riscritta in redazione.',
    },
  });

  assert.deepEqual(overrides, {
    citazione: {
      testo: 'Una citazione riscritta in redazione.',
      fonte: '',
    },
  });

  const applied = applyEditorialContentOverrides({
    data_odierna: '1 settembre',
    autore_giorno: 'Blaise Cendrars',
    breve_descrizione: '',
    citazione: {
      testo: 'Testo automatico',
      autore: 'Blaise Cendrars',
      fonte: 'Prose du Transsibérien et de la petite Jehanne de France',
    },
    avvenimenti: [],
    parola_giorno: { parola: '', definizione: '', etimologia: '', esempio: '', nota: '' },
    santi: [],
    bibbia: { testo: '', fonte: '', nota: '' },
    poesia: { testo: '', autore: '', fonte: '', nota: '' },
    musica: { brano: '', autore: '', genere: '', motivo: '', chiave_ricerca: '' },
  }, overrides);

  assert.equal(applied.citazione.testo, 'Una citazione riscritta in redazione.');
  assert.equal(applied.citazione.fonte, '');
});

test('keeps an explicitly supplied source alongside a quote override', () => {
  assert.deepEqual(
    sanitizeEditorialContentOverrides({
      citazione: { testo: 'Un testo tradotto.', fonte: 'Edizione italiana' },
    }),
    { citazione: { testo: 'Un testo tradotto.', fonte: 'Edizione italiana' } },
  );
});

test('preserves an explicitly empty events list', () => {
  assert.deepEqual(
    sanitizeEditorialContentOverrides({ avvenimenti: ['  ', '\n'] }),
    { avvenimenti: [] },
  );
});
