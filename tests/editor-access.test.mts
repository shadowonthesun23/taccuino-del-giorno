import assert from 'node:assert/strict';
import test from 'node:test';
import { getConfiguredEditorUserId, isConfiguredEditorUser } from '../lib/editor-access.ts';

test('authorizes only the configured editor user', () => {
  const previousUserId = process.env.EDITOR_USER_ID;

  try {
    process.env.EDITOR_USER_ID = 'editor-user-id';
    assert.equal(getConfiguredEditorUserId(), 'editor-user-id');
    assert.equal(isConfiguredEditorUser('editor-user-id'), true);
    assert.equal(isConfiguredEditorUser('another-user-id'), false);
    assert.equal(isConfiguredEditorUser(null), false);
  } finally {
    if (previousUserId === undefined) {
      delete process.env.EDITOR_USER_ID;
    } else {
      process.env.EDITOR_USER_ID = previousUserId;
    }
  }
});
