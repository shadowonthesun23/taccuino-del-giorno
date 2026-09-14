import test from 'node:test';
import assert from 'node:assert/strict';
import { WikiquoteFinalizationError } from '../lib/finalize-generated-quote.ts';
import { finalizeWithWikiquoteRecovery } from '../lib/finalize-with-wikiquote-recovery.ts';

const noCandidates = () => new WikiquoteFinalizationError('no_candidates', 'Nessuna citazione disponibile.');
const candidate: string = 'candidate';

test('finalizzazione normale: nessun recovery', async () => {
  let finalizeCalls = 0;
  let recoverCalls = 0;
  const result = await finalizeWithWikiquoteRecovery(candidate, {
    finalize: async (data) => { finalizeCalls += 1; return data + '-finalized'; },
    recover: async (data) => { recoverCalls += 1; return data; },
  });

  assert.equal(result, 'candidate-finalized');
  assert.equal(finalizeCalls, 1);
  assert.equal(recoverCalls, 0);
});

test('no_candidates iniziale: un recovery e una seconda finalizzazione', async () => {
  let finalizeCalls = 0;
  let recoverCalls = 0;
  const result = await finalizeWithWikiquoteRecovery('candidate', {
    finalize: async (data) => {
      finalizeCalls += 1;
      if (finalizeCalls === 1) throw noCandidates();
      return data + '-finalized';
    },
    recover: async (data) => { recoverCalls += 1; return data + '-recovered'; },
  });

  assert.equal(result, 'candidate-recovered-finalized');
  assert.equal(finalizeCalls, 2);
  assert.equal(recoverCalls, 1);
});

test('no_candidates anche dopo il recovery: non esegue un secondo recovery', async () => {
  let finalizeCalls = 0;
  let recoverCalls = 0;
  await assert.rejects(() => finalizeWithWikiquoteRecovery(candidate, {
    finalize: async () => { finalizeCalls += 1; throw noCandidates(); },
    recover: async (data) => { recoverCalls += 1; return data + '-recovered'; },
  }), (error: unknown) => error instanceof WikiquoteFinalizationError && error.code === 'no_candidates');

  assert.equal(finalizeCalls, 2);
  assert.equal(recoverCalls, 1);
});

test('autore forzato: no_candidates propagato senza recovery', async () => {
  let recoverCalls = 0;
  await assert.rejects(() => finalizeWithWikiquoteRecovery(candidate, {
    forcedAuthor: 'Autore obbligatorio',
    finalize: async () => { throw noCandidates(); },
    recover: async (data) => { recoverCalls += 1; return data; },
  }), (error: unknown) => error instanceof WikiquoteFinalizationError && error.code === 'no_candidates');

  assert.equal(recoverCalls, 0);
});

test('errori diversi da no_candidates propagati senza recovery', async () => {
  for (const error of [
    new WikiquoteFinalizationError('http_error', 'offline'),
    new WikiquoteFinalizationError('author_mismatch', 'autore diverso'),
    new Error('errore tecnico'),
  ]) {
    let recoverCalls = 0;
    await assert.rejects(() => finalizeWithWikiquoteRecovery(candidate, {
      finalize: async () => { throw error; },
      recover: async (data) => { recoverCalls += 1; return data; },
    }), error);
    assert.equal(recoverCalls, 0);
  }
});
