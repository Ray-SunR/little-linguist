import { test, expect } from '@playwright/test';
import { ensureTestUser, ensureChildProfile } from './e2e-utils';

test('Guest to Existing User with Profile Selection', async ({ page, context }) => {
  test.setTimeout(180000);

  await context.clearCookies();
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('lumo_tutorial_completed_v2', 'true');
    window.localStorage.setItem('lumo-cookie-consent', 'accepted');
  });

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

  await page.addStyleTag({
    content: `*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }`,
  });

  const testEmail = `existing-${Date.now()}@example.com`;
  const existingChildName = 'LeoExisting';
  await ensureTestUser(testEmail, 'password123');
  await ensureChildProfile(testEmail, existingChildName);

  await page.goto('/story-maker');

  const nameInput = page.getByPlaceholder('Leo, Mia, Sam...');
  await expect(nameInput).toBeVisible({ timeout: 60000 });
  await nameInput.fill('MagicGuest');
  await page.getByTestId('identity-continue-name').click();
  
  await expect(page.getByTestId('hero-identity-form')).toHaveAttribute('data-step', 'age', { timeout: 15000 });
  await page.getByTestId('identity-continue-age').click();

  await expect(page.getByTestId('hero-identity-form')).toHaveAttribute('data-step', 'gender', { timeout: 15000 });
  await page.getByTestId('gender-button-boy').click();
  await page.getByTestId('identity-continue-gender').click();

  await expect(page.getByTestId('hero-identity-form')).toHaveAttribute('data-step', 'avatar', { timeout: 15000 });
  await page.getByTestId('identity-complete').click();
  
  await expect(page.getByText("Stories They'll")).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Space' }).click();
  await page.getByTestId('onboarding-finish').click();

  await expect(page.getByTestId('story-topic-input')).toBeVisible({ timeout: 15000 });
  await page.getByTestId('story-topic-input').fill('Dinosaurs');
  await page.getByTestId('onboarding-topic-next').click();

  await expect(page.getByTestId('story-setting-input')).toBeVisible({ timeout: 15000 });
  await page.getByTestId('story-setting-input').fill('Space');
  await page.getByTestId('onboarding-setting-next').click();

  await expect(page.getByTestId('words-tab-content')).toBeVisible({ timeout: 30000 });

  const castSpellBtn = page.getByTestId('onboarding-create-story');
  const skipBtn = page.getByRole('button', { name: 'Skip and create anyway' });
  
  if (await skipBtn.isVisible()) {
    await skipBtn.click();
  } else {
    await castSpellBtn.click({ force: true });
  }

  await page.waitForURL(/\/login/, { timeout: 30000 });
  await page.getByPlaceholder('Magic Email').fill(testEmail);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByPlaceholder('Secret Word').fill('password123');
  await page.getByRole('button', { name: 'Enter Realm' }).click();

  await page.waitForURL(url => url.pathname.includes('/story-maker') && url.searchParams.get('action') === 'resume_story_maker', { timeout: 60000 });

  await expect(page.getByTestId('profile-selection-screen')).toBeVisible({ timeout: 30000 });
  
  await expect(page.getByText('Who is this Story For?')).toBeVisible({ timeout: 15000 });

  const profileButton = page.locator(`[data-testid^="profile-card-"]`).filter({ hasText: existingChildName }).first();
  await expect(profileButton).toBeVisible();
  await profileButton.click();

  await expect(page.locator('.page-story-maker')).toHaveAttribute('data-status', 'GENERATING', { timeout: 45000 });

  await expect(page).toHaveURL(/\/reader\//, { timeout: 120000 });
  await expect(page.getByText('MagicGuest', { exact: false }).first()).toBeVisible({ timeout: 60000 });
});
