import { test, expect } from '@playwright/test';
import { completeOnboarding, ensureTestUser } from './e2e-utils';

test('Authenticated Story Maker Workflow', async ({ page, context }) => {
  test.setTimeout(180000);

  // Ensure fresh state by clearing all cookies/storage
  await context.clearCookies();

  // Set required flags and clear session data
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('lumo_tutorial_completed_v2', 'true');
    window.localStorage.setItem('lumo-cookie-consent', 'accepted');
  });

  // Mock quota API to ensure buttons are enabled
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

  // Disable all CSS animations/transitions for stability
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

  const testEmail = `test-auth-${Date.now()}@example.com`;
  await ensureTestUser(testEmail, 'password123');

  await page.goto('/login');
  const emailInput = page.getByPlaceholder('Magic Email');
  await emailInput.click();
  await emailInput.pressSequentially(testEmail, { delay: 50 });
  await page.waitForTimeout(500); 
  await page.getByRole('button', { name: 'Continue' }).click();

  const passwordInput = page.getByPlaceholder('Secret Word');
  await passwordInput.fill('password123');
  const enterButton = page.getByRole('button', { name: 'Enter Realm' });
  await expect(enterButton).toBeEnabled();
  await enterButton.click();

  // Wait for login to complete
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 120000 });
  await page.waitForTimeout(2000);

  // If we landed on onboarding, handle it
  if (page.url().includes('/onboarding')) {
    await completeOnboarding(page, 'AuthKid');
  }

  // Now navigate to our target page
  console.log('Navigating to story-maker...');
  await page.goto('/story-maker', { waitUntil: 'load' });
  
  // Wait for Bento Dashboard to be ready
  await expect(page.locator('.page-story-maker')).toHaveAttribute('data-status', 'CONFIGURING', { timeout: 60000 });

  // Unified Bento Dashboard interaction
  const nameInput = page.getByPlaceholder('Leo, Mia, Sam...');
  await expect(nameInput).toBeVisible({ timeout: 30000 });
  
  await nameInput.fill('Leo');
  
  // Click the Boy gender button
  console.log('Selecting Boy gender...');
  await expect(page.getByTestId('gender-button-boy')).toBeVisible({ timeout: 15000 });
  const boyBtn = page.getByTestId('gender-button-boy');
  await boyBtn.scrollIntoViewIfNeeded();
  await boyBtn.click({ force: true });
  
  await expect(page.getByTestId('story-topic-input')).toBeVisible({ timeout: 15000 });
  await page.getByTestId('story-topic-input').fill('Dinosaurs');
  await expect(page.getByTestId('story-setting-input')).toBeVisible({ timeout: 15000 });
  await page.getByTestId('story-setting-input').fill('Space');
  
  // Click Next Step to go to Words tab
  await page.getByTestId('story-config-next').click();
  
  // Wait for words tab
  console.log('Waiting for words tab...');
  await expect(page.getByTestId('words-tab-content')).toBeVisible({ timeout: 30000 });
  
  const castSpellBtn = page.getByTestId('cast-spell-button');
  const skipBtn = page.getByRole('button', { name: 'Skip and create anyway' });

  if (await skipBtn.isVisible()) {
      console.log('No words found, skipping...');
      await skipBtn.click();
  } else {
      console.log('Attempting to cast spell directly...');
      await expect(castSpellBtn).toBeVisible({ timeout: 10000 });
      await castSpellBtn.click({ force: true });
  }

  // Wait for explicit state signal: data-status="GENERATING"
  await expect(page.locator('.page-story-maker')).toHaveAttribute('data-status', 'GENERATING', { timeout: 30000 });

  // Reader redirection
  await expect(page).toHaveURL(/\/reader\//, { timeout: 60000 });
  await expect(page.getByText('Leo').first()).toBeVisible();
});
