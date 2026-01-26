import { test, expect } from '@playwright/test';
import { ensureTestUser } from './e2e-utils';

test('Mission Sync and Completion Workflow', async ({ page, context }) => {
  test.setTimeout(180000);

  // Ensure fresh state
  await context.clearCookies();

  // Set required flags
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('lumo_tutorial_completed_v2', 'true');
    window.localStorage.setItem('lumo-cookie-consent', 'accepted');
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    } else {
      console.log('BROWSER LOG:', msg.text());
    }
  });
  page.on('pageerror', err => console.log('BROWSER UNHANDLED ERROR:', err.message));

  const testEmail = `test-mission-${Date.now()}@example.com`;
  await ensureTestUser(testEmail, 'password123');

  // 1. Login
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

  // Wait for login redirect to settle
  console.log('Waiting for login to complete...');
  await expect(page).not.toHaveURL(/\/login/, { timeout: 120000 });

  // Wait a bit for the redirection to settle
  await page.waitForTimeout(3000);

  // 2. Handle Onboarding if it appears
  if (page.url().includes('/onboarding')) {
    console.log('Onboarding detected, completing wizard...');

    // Step: Name
    const nameInput = page.getByPlaceholder('Leo, Mia, Sam...');
    await expect(nameInput).toBeVisible({ timeout: 15000 });
    await nameInput.fill('MissionHero');
    await page.getByTestId('identity-continue-name').click();

    // Step: Age
    await expect(page.getByTestId('hero-identity-form')).toHaveAttribute('data-step', 'age', { timeout: 15000 });
    await page.getByTestId('identity-continue-age').click();

    // Step: Gender
    await expect(page.getByTestId('hero-identity-form')).toHaveAttribute('data-step', 'gender', { timeout: 15000 });
    await page.getByTestId('gender-button-boy').click();
    await page.getByTestId('identity-continue-gender').click();

    // Step: Avatar
    await expect(page.getByTestId('hero-identity-form')).toHaveAttribute('data-step', 'avatar', { timeout: 15000 });
    await page.getByTestId('identity-complete').click();

    // Step: Interests
    await expect(page.getByText('Magic Interests!')).toBeVisible({ timeout: 15000 });
    // Use role=button to ensure we click the actual interest buttons, not other text
    await page.getByRole('button', { name: 'Space' }).click();
    await page.getByRole('button', { name: 'Dinosaurs' }).click();
    // Wait a moment for the interests to register in state
    await page.waitForTimeout(500);
    await page.getByTestId('onboarding-finish').click();

    // Wait for navigation to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 120000 });
  } else {
    // If not on onboarding, explicitly go to dashboard
    console.log('Not on onboarding, navigating to dashboard...');
    await page.goto('/dashboard');
  }

  // 3. Go to Dashboard
  console.log('Checking for Mission Control...');
  await expect(page.getByText('Mission Control')).toBeVisible({ timeout: 30000 });

  // Helper to get current coins
  const getCoins = async () => {
    const coinsDisplay = page.locator('div:has-text("Explorer Status")').locator('span:has-text("Coins")').first();
    const coinsText = await coinsDisplay.innerText();
    const match = coinsText.match(/(\d+)\s+Coins/i);
    return match ? parseInt(match[1]) : 0;
  };

  const initialCoins = await getCoins();
  console.log(`Initial Coins: ${initialCoins}`);

  // 4. Identify a mission book
  const missionStartBtn = page.locator('a[href*="mission=true"]').first();

  try {
    await expect(missionStartBtn).toBeVisible({ timeout: 20000 });
  } catch (e) {
    if (await page.getByText('All Missions Clear!').isVisible()) {
      console.log('Missions are clear, creating a story...');
      await page.goto('/story-maker');
      await expect(page.locator('.page-story-maker')).toHaveAttribute('data-status', 'CONFIGURING', { timeout: 30000 });

      await page.getByPlaceholder('Leo, Mia, Sam...').fill('MissionHero');
      await page.getByTestId('gender-button-boy').click();
      await page.getByTestId('story-topic-input').fill('A Mission Adventure');
      await page.getByTestId('story-setting-input').fill('Space');
      await page.getByTestId('story-config-next').click();
      await expect(page.getByTestId('words-tab-content')).toBeVisible();
      await page.getByRole('button', { name: /Cast Spell|Skip/ }).first().click();

      // Wait for generation and reader
      await expect(page).toHaveURL(/\/reader\//, { timeout: 60000 });
      console.log('Story created, returning to dashboard...');
      await page.goto('/dashboard');
      await expect(missionStartBtn).toBeVisible({ timeout: 20000 });
    } else {
      throw e;
    }
  }

  const missionCardInitial = missionStartBtn.locator('xpath=ancestor::*[contains(@class,"clay-card")][1]');
  const bookTitle = await missionCardInitial.getByRole('heading').first().innerText();
  console.log(`Starting mission for book: ${bookTitle}`);

  // 5. Click on it to go to the reader
  await missionStartBtn.click();

  // 6. Wait for the reader to load
  await expect(page).toHaveURL(/\/reader\//, { timeout: 30000 });
  await expect(page.locator('#reader-text-content')).toBeVisible({ timeout: 30000 });

  // 7. Simulating reading to the end
  const lastWord = page.locator('[data-word-index]').last();
  await lastWord.scrollIntoViewIfNeeded();
  await lastWord.click();

  // Wait for completion state to sync
  await page.waitForTimeout(10000);

  // 8. Click the "Back" button to return to dashboard
  const backBtn = page.locator('#reader-back-to-library');
  await expect(backBtn).toBeVisible({ timeout: 5000 });

  // Use Promise.all to wait for navigation + click simultaneously
  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: 30000 }),
    backBtn.click({ force: true })
  ]);

  // 9. Verify we are on dashboard

  // 10. Verify stamp
  const missionCardResult = page.locator('.clay-card').filter({ hasText: bookTitle });
  await expect(missionCardResult.getByText(/Mission.*Accomplished/s)).toBeVisible({ timeout: 20000 });

  const coinsAfterFirstRead = await getCoins();
  expect(coinsAfterFirstRead).toBeGreaterThan(initialCoins);

  console.log('Test PASSED: Mission sync verified.');
});
