import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BASE } from './helpers.js';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok(data.time, 'should include a timestamp');
  });
});
