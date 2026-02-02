import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { BASE, testEmail, deleteTestUser, createTestUser } from './helpers.js';

describe('GET /api/welcome-status/:token', () => {
  const cleanupEmails = [];

  after(async () => {
    for (const email of cleanupEmails) {
      await deleteTestUser(email);
    }
  });

  it('returns status for a known token', async () => {
    const email = testEmail('ws-known');
    cleanupEmails.push(email);

    const { data: subData } = await createTestUser({ email });
    assert.ok(subData.token);

    const res = await fetch(`${BASE}/api/welcome-status/${subData.token}`);
    assert.equal(res.status, 200);

    const data = await res.json();
    // Status should be one of: generating, sent, error
    assert.ok(
      ['generating', 'sent', 'error'].includes(data.status),
      `expected generating/sent/error, got "${data.status}"`
    );
  });

  it('returns { status: "unknown" } for an unknown token', async () => {
    const res = await fetch(`${BASE}/api/welcome-status/00000000-0000-0000-0000-000000000000`);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.status, 'unknown');
  });
});
