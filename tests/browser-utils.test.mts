import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getRenderableImageUrl,
  sanitizeEditorialMediaCrops,
} from '../lib/editorial-media.ts';

test('keeps local and embedded image sources intact while proxying remote sources', () => {
  assert.equal(getRenderableImageUrl('/images/author.jpg'), '/images/author.jpg');
  assert.equal(getRenderableImageUrl('data:image/jpeg;base64,ZmFrZQ=='), 'data:image/jpeg;base64,ZmFrZQ==');
  assert.equal(getRenderableImageUrl('/api/image-proxy?url=https%3A%2F%2Fexample.com%2Fimage.jpg'), '/api/image-proxy?url=https%3A%2F%2Fexample.com%2Fimage.jpg');
  assert.equal(
    getRenderableImageUrl('https://upload.wikimedia.org/example.jpg'),
    '/api/image-proxy?url=https%3A%2F%2Fupload.wikimedia.org%2Fexample.jpg',
  );
});

test('preserves independent table crop settings and clamps their values', () => {
  assert.deepEqual(
    sanitizeEditorialMediaCrops({
      autore: { x: 12, y: 88, zoom: 1.4 },
      tavola_autore: { x: -20, y: 120, zoom: 4 },
      tavola_santi: { x: 34, y: 66, zoom: 1.15 },
      tavola_poesia: { x: 72, y: 18, zoom: 2 },
      ignored: { x: 50, y: 50, zoom: 1 },
    }),
    {
      autore: { x: 12, y: 88, zoom: 1.4 },
      tavola_autore: { x: 0, y: 100, zoom: 3 },
      tavola_santi: { x: 34, y: 66, zoom: 1.15 },
      tavola_poesia: { x: 72, y: 18, zoom: 2 },
    },
  );
});
