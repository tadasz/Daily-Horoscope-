import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BASE, ADMIN_TOKEN } from './helpers.js';

describe('GET /admin/stats', () => {
  it('returns 200 with subscriber data when token is valid', async () => {
    const res = await fetch(`${BASE}/admin/stats?token=${ADMIN_TOKEN}`);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.ok(Array.isArray(data.subscribers), 'should have subscribers array');
    assert.ok('unsubscribed' in data, 'should have unsubscribed count');
    assert.ok(Array.isArray(data.signupTrend), 'should have signupTrend');
    assert.ok(data.emailsSent, 'should have emailsSent');
    assert.ok(Array.isArray(data.recentUsers), 'should have recentUsers');
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${BASE}/admin/stats`);
    assert.equal(res.status, 401);
  });

  it('returns 401 with wrong token', async () => {
    const res = await fetch(`${BASE}/admin/stats?token=wrong-token`);
    assert.equal(res.status, 401);
  });
});
