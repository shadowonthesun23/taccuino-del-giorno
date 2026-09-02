import assert from 'node:assert/strict';
import test from 'node:test';
import { getRenderableImageUrl } from '../lib/editorial-media.ts';

test('keeps local and embedded image sources intact while proxying remote sources', () => {
  assert.equal(getRenderableImageUrl('/images/author.jpg'), '/images/author.jpg');
  assert.equal(getRenderableImageUrl('data:image/jpeg;base64,ZmFrZQ=='), 'data:image/jpeg;base64,ZmFrZQ==');
  assert.equal(getRenderableImageUrl('/api/image-proxy?url=https%3A%2F%2Fexample.com%2Fimage.jpg'), '/api/image-proxy?url=https%3A%2F%2Fexample.com%2Fimage.jpg');
  assert.equal(
    getRenderableImageUrl('https://upload.wikimedia.org/example.jpg'),
    '/api/image-proxy?url=https%3A%2F%2Fupload.wikimedia.org%2Fexample.jpg',
  );
});
