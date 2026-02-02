// Test helpers for API tests
const BASE = 'http://localhost:3001';
const ADMIN_TOKEN = 'gato-admin-2026';

let testCounter = 0;

/**
 * Generate a unique test email to avoid collisions between parallel tests.
 */
export function testEmail(prefix = 'test') {
  testCounter++;
  return `test-${prefix}-${Date.now()}-${testCounter}@test.com`;
}

/**
 * Clean up a test user by email via the admin DELETE endpoint.
 */
export async function deleteTestUser(email) {
  try {
    await fetch(`${BASE}/admin/users/${encodeURIComponent(email)}?token=${ADMIN_TOKEN}`, {
      method: 'DELETE',
    });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Create a test subscriber and return the response data + email for cleanup.
 */
export async function createTestUser(overrides = {}) {
  const email = overrides.email || testEmail();
  const body = {
    name: 'Test User',
    email,
    birth_date: '1990-06-15',
    birth_city: 'London',
    ...overrides,
  };

  const res = await fetch(`${BASE}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return { res, data, email };
}

export { BASE, ADMIN_TOKEN };
