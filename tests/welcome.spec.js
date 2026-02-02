// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Welcome page', () => {

  test('/welcome/fake-token loads progress page', async ({ page }) => {
    await page.goto('/welcome/fake-token-12345');

    // Should show the loading view with steps
    await expect(page.locator('#loading-view')).toBeVisible();
    await expect(page.locator('#title')).toBeVisible();
    await expect(page.locator('#title')).toContainText('Reading the stars');
  });

  test('shows steps and animation', async ({ page }) => {
    await page.goto('/welcome/fake-token-99999');

    // All 4 steps should be present
    await expect(page.locator('#step1')).toBeVisible();
    await expect(page.locator('#step2')).toBeVisible();
    await expect(page.locator('#step3')).toBeVisible();
    await expect(page.locator('#step4')).toBeVisible();

    // Step 1 should be active initially (has spinner)
    await expect(page.locator('#step1')).toHaveClass(/active/);
    await expect(page.locator('#step1 .spinner')).toBeVisible();

    // The floating icon animation should be running
    const icon = page.locator('.icon-wrap');
    await expect(icon).toBeVisible();
    await expect(icon).toContainText('🔭');
  });

  test('status text is visible', async ({ page }) => {
    await page.goto('/welcome/some-token');

    const statusText = page.locator('#status-text');
    await expect(statusText).toBeVisible();
    await expect(statusText).toContainText('cosmic blueprint');
  });

  test('done view is initially hidden', async ({ page }) => {
    await page.goto('/welcome/some-token');
    await expect(page.locator('#done-view')).toBeHidden();
  });
});
