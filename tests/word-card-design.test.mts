import assert from 'node:assert/strict';
import test from 'node:test';
import { getWordSocialCardLayout } from '../app/lib/wordCardDesign.ts';

test('keeps a short word and light copy in the airy social composition', () => {
  const layout = getWordSocialCardLayout(
    'Sermone',
    'Dal latino sermo, discorso.',
    'Discorso rivolto a un pubblico, spesso con intento morale o religioso.',
    'Un sermone breve e appassionato.',
  );

  assert.equal(layout.variant, 'airy');
  assert.equal(layout.wordTier, 'short');
  assert.equal(layout.wordMaxLines, 2);
  assert.equal(layout.definitionMaxLines, 6);
  assert.equal(layout.exampleMaxLines, 4);
});

test('moves dense copy to a compact, still-readable layout', () => {
  const layout = getWordSocialCardLayout(
    'Incommensurabilità',
    'Dal latino tardo e dalla tradizione matematica, con significato figurato.',
    'Qualità di ciò che non può essere misurato con una stessa unità o ricondotto a un rapporto semplice e comune, anche in senso esteso e concettuale. Indica una differenza che resiste al confronto diretto e richiede una scala propria, senza poter essere ridotta a una formula breve o a un paragone immediato. In una definizione editoriale estesa comprende inoltre sfumature, contesti d’uso e conseguenze che il lettore deve poter seguire senza perdere il filo del discorso principale.',
    'La distanza tra le due esperienze sembrava ormai un’incommensurabilità impossibile da risolvere con le parole consuete, con una frase abbastanza lunga da verificare il contenimento tipografico.',
    'Una nota laterale abbastanza lunga da contribuire alla densità complessiva della tavola e a richiedere una riduzione controllata degli spazi, mantenendo comunque un margine di sicurezza.',
  );

  assert.equal(layout.variant, 'compact');
  assert.equal(layout.wordTier, 'medium');
  assert.equal(layout.definitionMaxLines, 8);
  assert.equal(layout.exampleMaxLines, 3);
});

test('allows an exceptional word to use the third fallback line', () => {
  const layout = getWordSocialCardLayout(
    'Pneumonoultramicroscopicsilicovolcanoconiosis',
    '',
    'Una parola eccezionalmente lunga.',
  );

  assert.equal(layout.wordTier, 'long');
  assert.equal(layout.wordMaxLines, 3);
});
