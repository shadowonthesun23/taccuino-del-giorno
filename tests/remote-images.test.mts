import assert from 'node:assert/strict';
import test from 'node:test';
import { trustedImageUrl } from '../lib/remote-images.ts';

test('accepts only trusted HTTPS image hosts', () => {
  assert.equal(trustedImageUrl('https://images.metmuseum.org/CRDImages/ep/original/example.jpg')?.hostname, 'images.metmuseum.org');
  assert.equal(trustedImageUrl('https://upload.wikimedia.org/example.jpg')?.hostname, 'upload.wikimedia.org');
  assert.equal(trustedImageUrl('https://example.com/image.jpg'), null);
  assert.equal(trustedImageUrl('http://images.metmuseum.org/image.jpg'), null);
  assert.equal(trustedImageUrl('https://images.metmuseum.org@evil.example/image.jpg'), null);
});
