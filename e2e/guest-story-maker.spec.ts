import { test, expect } from '@playwright/test';
import { completeOnboarding, ensureTestUser } from './e2e-utils';

test('Full Guest to Story Workflow', async ({ page, context }) => {
  test.setTimeout(180000);

  // Ensure fresh state by clearing all cookies/storage
  await context.clearCookies();

  // Set required flags and clear previous session data safely
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('lumo_tutorial_completed_v2', 'true');
    window.localStorage.setItem('lumo-cookie-consent', 'accepted');
  });

  // Mock quota API
  await page.route('**/api/usage?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        usage: {
          story_generation: { current: 0, limit: 3, isLimitReached: false },
          image_generation: { current: 0, limit: 10, isLimitReached: false }
        },
        plan: 'pro',
        identity_key: 'test-identity'
      })
    });
  });

  // Disable all CSS animations/transitions
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0s !important;
        scroll-behavior: auto !important;
      }
    `,
  });

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  await page.goto('/story-maker');

  // Direct check for name input as proof of readiness
  const nameInput = page.getByPlaceholder('Leo, Mia, Sam...');
  await expect(nameInput).toBeVisible({ timeout: 60000 });
  
  await nameInput.fill('Leo');
  
  // Click the Boy gender button
  console.log('Selecting Boy gender...');
  const boyBtn = page.getByTestId('gender-button-boy');
  await boyBtn.scrollIntoViewIfNeeded();
  await boyBtn.click({ force: true });
  
  console.log('Filling topic...');
  await page.getByTestId('story-topic-input').fill('Dinosaurs');
  await page.getByTestId('story-setting-input').fill('Space');
  
  // Click Next Step
  await page.getByTestId('story-config-next').click();
  
  // Wait for words tab
  await expect(page.getByTestId('words-tab-content')).toBeVisible({ timeout: 30000 });
  const castSpellBtn = page.getByTestId('cast-spell-button');
  const skipBtn = page.getByRole('button', { name: 'Skip and create anyway' });
  
  if (await skipBtn.isVisible()) {
    await skipBtn.click();
  } else {
    await castSpellBtn.click({ force: true });
  }

  // Handle Login redirect
  const loginUrlPattern = /\/login/;
  try {
    await page.waitForURL(loginUrlPattern, { timeout: 30000 });
  } catch {
    const keepProgressLink = page.getByRole('link', { name: 'Keep My Progress' });
    if (await keepProgressLink.isVisible()) {
      await keepProgressLink.click();
      await page.waitForURL(loginUrlPattern, { timeout: 60000 });
    }
  }

  const testEmail = `test-${Date.now()}@example.com`;
  await ensureTestUser(testEmail, 'password123');
  await page.getByPlaceholder('Magic Email').fill(testEmail);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByPlaceholder('Secret Word').fill('password123');
  await page.getByRole('button', { name: 'Enter Realm' }).click();

  // Wait for redirect to story-maker or onboarding
  await page.waitForURL(url =>
    (url.pathname.includes('/story-maker') && url.searchParams.get('action') === 'resume_story_maker') ||
    (url.pathname.includes('/onboarding')),
    { timeout: 120000 }
  );

  if (page.url().includes('/onboarding')) {
    await completeOnboarding(page, 'LeoHero');
    await page.goto('/story-maker?action=resume_story_maker');
  }

  // Wait for GENERATING status
  await expect(page.locator('.page-story-maker')).toHaveAttribute('data-status', 'GENERATING', { timeout: 45000 });

  // Wait for reader
  await expect(page).toHaveURL(/\/reader\//, { timeout: 60000 });
  await expect(page.getByText('Leo').first()).toBeVisible();

  // Verify image blocks
  const imageBlocks = page.locator('.book-image-block');
  await expect(imageBlocks.first()).toBeVisible({ timeout: 30000 });
});
