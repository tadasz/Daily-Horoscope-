// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {

  test('/ loads with signup form', async ({ page }) => {
    await page.goto('/');

    // Should show the GATO title and signup form
    await expect(page.locator('.logo-text')).toContainText('GATO');
    await expect(page.locator('h1')).toBeVisible();

    // The signup form should be present
    await expect(page.locator('.signup-form')).toBeVisible();
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#birth_date')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('/lt loads Lithuanian version', async ({ page }) => {
    await page.goto('/lt');

    // Lithuanian page should load (check it doesn't 404)
    await expect(page.locator('body')).toBeVisible();
    // The page should have Lithuanian content or at least a form
    const html = await page.content();
    expect(html.length).toBeGreaterThan(500);
  });

  test('form submission works (mocked)', async ({ page }) => {
    await page.goto('/');

    // Fill in the form
    await page.fill('#name', 'Test Landing');
    await page.fill('#email', `test-landing-${Date.now()}@test.com`);
    await page.fill('#birth_date', '1990-06-15');
    await page.fill('#birth_city', 'Berlin, Germany');

    // Mock the subscribe endpoint
    await page.route('**/subscribe', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          token: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          sun_sign: 'Gemini',
        }),
      });
    });

    // Mock navigation to welcome page (prevent actual navigation)
    const [response] = await Promise.all([
      page.waitForURL('**/welcome/**', { timeout: 5000 }),
      page.locator('button[type="submit"]').click(),
    ]);

    // Should navigate to welcome page
    expect(page.url()).toContain('/welcome/');
  });
});
