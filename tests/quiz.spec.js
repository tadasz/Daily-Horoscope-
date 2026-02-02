// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Quiz flow', () => {

  test('page loads at /quiz', async ({ page }) => {
    await page.goto('/quiz');
    // Should show the first slide with "Step 1 of 9"
    await expect(page.locator('.slide.active')).toBeVisible();
    await expect(page.locator('.slide.active .slide-number')).toContainText('Step 1');
    await expect(page.locator('.slide.active h2')).toBeVisible();
  });

  test('can select Oracle style and it gets selected state', async ({ page }) => {
    await page.goto('/quiz');

    // Click the "Seer — mystic" option
    const mysticOption = page.locator('.slide.active .option[data-value="mystic"]');
    await mysticOption.click();

    // Should have "selected" class
    await expect(mysticOption).toHaveClass(/selected/);
  });

  test('auto-advances to next slide after selecting an option', async ({ page }) => {
    await page.goto('/quiz');

    // Click an option on slide 1
    await page.locator('.slide.active .option[data-value="practical"]').click();

    // Wait for slide 2 to become active (auto-advance after 300ms)
    await expect(page.locator('[data-slide="2"].active')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('[data-slide="2"].active .slide-number')).toContainText('Step 2');
  });

  test('can navigate back', async ({ page }) => {
    await page.goto('/quiz');

    // Advance to slide 2
    await page.locator('.slide.active .option[data-value="mystic"]').click();
    await expect(page.locator('[data-slide="2"].active')).toBeVisible({ timeout: 2000 });

    // Click "← Back"
    await page.locator('[data-slide="2"].active .btn-back').click();

    // Should be back on slide 1
    await expect(page.locator('[data-slide="1"].active')).toBeVisible({ timeout: 2000 });
  });

  test('multi-select works on life focus step (slide 3)', async ({ page }) => {
    await page.goto('/quiz');

    // Navigate to slide 3: select option on slide 1, then slide 2
    await page.locator('[data-slide="1"] .option[data-value="mystic"]').click();
    await expect(page.locator('[data-slide="2"].active')).toBeVisible({ timeout: 2000 });
    await page.locator('[data-slide="2"] .option[data-value="short"]').click();
    await expect(page.locator('[data-slide="3"].active')).toBeVisible({ timeout: 2000 });

    // Click multiple focus areas
    const career = page.locator('[data-slide="3"] .multi-option[data-value="career"]');
    const love = page.locator('[data-slide="3"] .multi-option[data-value="love"]');
    const health = page.locator('[data-slide="3"] .multi-option[data-value="health"]');

    await career.click();
    await love.click();
    await health.click();

    await expect(career).toHaveClass(/selected/);
    await expect(love).toHaveClass(/selected/);
    await expect(health).toHaveClass(/selected/);

    // Can deselect
    await career.click();
    await expect(career).not.toHaveClass(/selected/);
  });

  test('birth info validation — alerts when fields are empty', async ({ page }) => {
    await page.goto('/quiz');

    // Navigate to slide 6 (birth info)
    await page.locator('[data-slide="1"] .option[data-value="mystic"]').click();
    await expect(page.locator('[data-slide="2"].active')).toBeVisible({ timeout: 2000 });
    await page.locator('[data-slide="2"] .option[data-value="short"]').click();
    await expect(page.locator('[data-slide="3"].active')).toBeVisible({ timeout: 2000 });
    await page.locator('[data-slide="3"] .btn-next').click();
    await expect(page.locator('[data-slide="4"].active')).toBeVisible({ timeout: 2000 });
    await page.locator('[data-slide="4"] .option[data-value="single"]').click();
    await expect(page.locator('[data-slide="5"].active')).toBeVisible({ timeout: 2000 });
    await page.locator('[data-slide="5"] .option[data-value="morning"]').click();
    await expect(page.locator('[data-slide="6"].active')).toBeVisible({ timeout: 2000 });

    // Try to continue without filling birthday and city
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('birthday');
      await dialog.accept();
    });

    await page.locator('[data-slide="6"] .btn-next').click();

    // Should still be on slide 6
    await expect(page.locator('[data-slide="6"].active')).toBeVisible();
  });

  test('full flow: complete all 9 steps → paywall screen visible', async ({ page }) => {
    await page.goto('/quiz');
    const timestamp = Date.now();

    // Slide 1: Oracle style
    await page.locator('[data-slide="1"] .option[data-value="casual"]').click();
    await expect(page.locator('[data-slide="2"].active')).toBeVisible({ timeout: 2000 });

    // Slide 2: Length
    await page.locator('[data-slide="2"] .option[data-value="medium"]').click();
    await expect(page.locator('[data-slide="3"].active')).toBeVisible({ timeout: 2000 });

    // Slide 3: Life focus (multi-select) — pick one and click Continue
    await page.locator('[data-slide="3"] .multi-option[data-value="growth"]').click();
    await page.locator('[data-slide="3"] .btn-next').click();
    await expect(page.locator('[data-slide="4"].active')).toBeVisible({ timeout: 2000 });

    // Slide 4: Relationship
    await page.locator('[data-slide="4"] .option[data-value="single"]').click();
    await expect(page.locator('[data-slide="5"].active')).toBeVisible({ timeout: 2000 });

    // Slide 5: Read time
    await page.locator('[data-slide="5"] .option[data-value="morning"]').click();
    await expect(page.locator('[data-slide="6"].active')).toBeVisible({ timeout: 2000 });

    // Slide 6: Birth info
    await page.fill('#q-birthday', '1992-08-14');
    await page.fill('#q-city', 'London, UK');
    await page.locator('[data-slide="6"] .btn-next').click();
    await expect(page.locator('[data-slide="7"].active')).toBeVisible({ timeout: 2000 });

    // Slide 7: Gender
    await page.locator('[data-slide="7"] .option[data-value="female"]').click();
    await expect(page.locator('[data-slide="8"].active')).toBeVisible({ timeout: 2000 });

    // Slide 8: Signup — intercept the subscribe API call
    const email = `test-pw-${timestamp}@test.com`;
    await page.fill('#q-name', 'Playwright Tester');
    await page.fill('#q-email', email);

    // Handle the API call - mock it so we don't create real users
    await page.route('**/subscribe', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          token: '12345678-1234-1234-1234-123456789abc',
          sun_sign: 'Leo',
        }),
      });
    });

    await page.locator('#signup-btn').click();

    // Slide 9: Paywall should be visible
    await expect(page.locator('[data-slide="9"].active')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.plan-free')).toBeVisible();
    await expect(page.locator('.plan-premium')).toBeVisible();
    await expect(page.locator('[data-slide="9"] h2')).toBeVisible();
  });

  test('language toggle works — /quiz?lang=lt shows Lithuanian text', async ({ page }) => {
    await page.goto('/quiz?lang=lt');

    // The first slide title should be in Lithuanian
    const title = page.locator('.slide.active h2');
    await expect(title).toContainText('Pasirink savo Orakulą');

    // Description should also be Lithuanian
    const desc = page.locator('.slide.active .slide-desc');
    await expect(desc).toContainText('balsu');
  });
});
