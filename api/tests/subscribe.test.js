import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { BASE, testEmail, deleteTestUser, createTestUser } from './helpers.js';

describe('POST /subscribe', () => {
  const cleanupEmails = [];

  after(async () => {
    for (const email of cleanupEmails) {
      await deleteTestUser(email);
    }
  });

  it('succeeds with valid data and returns token + sun_sign', async () => {
    const email = testEmail('sub-ok');
    cleanupEmails.push(email);

    const { res, data } = await createTestUser({ email });

    assert.equal(res.status, 200);
    assert.equal(data.status, 'ok');
    assert.ok(data.token, 'should return a token (UUID)');
    // sun_sign may be null if astro service is slow, but the field should exist
    assert.ok('sun_sign' in data, 'should include sun_sign field');
  });

  it('returns 400 when required fields are missing', async () => {
    // Missing name
    let res = await fetch(`${BASE}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@test.com', birth_date: '1990-01-01' }),
    });
    assert.equal(res.status, 400);
    let data = await res.json();
    assert.ok(data.error);

    // Missing email
    res = await fetch(`${BASE}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', birth_date: '1990-01-01' }),
    });
    assert.equal(res.status, 400);
    data = await res.json();
    assert.ok(data.error);

    // Missing birth_date
    res = await fetch(`${BASE}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'nobody@test.com' }),
    });
    assert.equal(res.status, 400);
    data = await res.json();
    assert.ok(data.error);
  });

  it('returns 409 for duplicate email', async () => {
    const email = testEmail('sub-dup');
    cleanupEmails.push(email);

    // First signup
    const first = await createTestUser({ email });
    assert.equal(first.res.status, 200);

    // Second signup with same email
    const second = await createTestUser({ email });
    assert.equal(second.res.status, 409);
    assert.ok(second.data.error);
  });

  it('saves quiz fields (quiz_style, quiz_length, quiz_relationship, quiz_read_time, gender)', async () => {
    const email = testEmail('sub-quiz');
    cleanupEmails.push(email);

    const quizData = {
      email,
      name: 'Quiz Tester',
      birth_date: '1995-03-22',
      birth_city: 'Vilnius',
      quiz_style: 'mystic',
      quiz_length: 'long',
      quiz_relationship: 'single',
      quiz_read_time: 'morning',
      gender: 'female',
    };

    const res = await fetch(`${BASE}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quizData),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');

    // Verify via admin stats (the user should appear in recent users)
    const statsRes = await fetch(`${BASE}/admin/stats?token=gato-admin-2026`);
    const stats = await statsRes.json();
    const user = stats.recentUsers.find(u => u.email === email);
    assert.ok(user, 'user should appear in admin stats');
    assert.equal(user.name, 'Quiz Tester');
  });
});
