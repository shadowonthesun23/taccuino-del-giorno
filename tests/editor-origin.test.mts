import assert from 'node:assert/strict';
import test from 'node:test';

import { isSameOriginRequest } from '../lib/editor-origin.ts';

const requestUrl = 'http://localhost:3000/api/editorial-media';

test('accepts an exact origin in production', () => {
  assert.equal(
    isSameOriginRequest('http://localhost:3000', requestUrl, 'production'),
    true,
  );
});

test('accepts localhost and 127.0.0.1 aliases on the same port in development', () => {
  assert.equal(
    isSameOriginRequest('http://127.0.0.1:3000', requestUrl, 'development'),
    true,
  );
  assert.equal(
    isSameOriginRequest(
      requestUrl.replace('http://localhost:3000', 'http://127.0.0.1:3000'),
      'http://localhost:3000/api/editorial-media',
      'development',
    ),
    true,
  );
});

test('keeps the loopback alias exception disabled outside development', () => {
  assert.equal(
    isSameOriginRequest('http://127.0.0.1:3000', requestUrl, 'production'),
    false,
  );
});

test('rejects a different port or protocol in development', () => {
  assert.equal(
    isSameOriginRequest('http://127.0.0.1:3001', requestUrl, 'development'),
    false,
  );
  assert.equal(
    isSameOriginRequest('https://127.0.0.1:3000', requestUrl, 'development'),
    false,
  );
});

test('rejects remote hosts and lookalike subdomains in development', () => {
  assert.equal(
    isSameOriginRequest('http://example.com:3000', requestUrl, 'development'),
    false,
  );
  assert.equal(
    isSameOriginRequest(
      'http://localhost.evil.example:3000',
      requestUrl,
      'development',
    ),
    false,
  );
  assert.equal(
    isSameOriginRequest('http://127.0.0.1.nip.io:3000', requestUrl, 'development'),
    false,
  );
});

test('preserves the existing behavior for missing and malformed origins', () => {
  assert.equal(isSameOriginRequest(null, requestUrl, 'production'), true);
  assert.equal(isSameOriginRequest('not an origin', requestUrl, 'development'), false);
});
