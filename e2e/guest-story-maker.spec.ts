import { test, expect } from '@playwright/test';
import { completeOnboarding } from './e2e-utils';

test('Full Guest to Story Workflow', async ({ page, context }) => {
  test.setTimeout(120000);

  // Ensure fresh state by clearing all cookies/storage
  await context.clearCookies();

  // Set required flags and clear previous session data safely
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('lumo_tutorial_completed_v2', 'true');
    window.localStorage.setItem('lumo-cookie-consent', 'accepted');
  });

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  await page.goto('/story-maker');

  await page.getByPlaceholder('Leo, Mia, Sam...').fill('Leo');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('How old is Leo?')).toBeVisible();
  await page.getByRole('button', { name: 'Yep!' }).click();

  await page.getByRole('button', { name: 'Boy' }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  await page.getByRole('button', { name: 'Skip' }).click();

  await page.getByRole('button', { name: 'Magic', exact: true }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByPlaceholder('Space, Dinosaurs, Tea Party...').fill('Dinosaurs');
  await page.getByRole('button', { name: 'Next' }).click();

  await page.getByPlaceholder('Enchanted Forest, Mars, Underwater...').fill('Space');
  await page.getByRole('button', { name: 'Next' }).click();

  await page.getByRole('button', { name: 'Dragon' }).click();
  await page.getByRole('button', { name: 'Create Story! ✨' }).click();

  await expect(page).toHaveURL(/\/login/);

  const testEmail = `test-${Date.now()}@example.com`;
  await page.getByPlaceholder('Magic Email').fill(testEmail);
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByPlaceholder('Secret Word').fill('password123');

  // Ensure button is ready
  const enterButton = page.getByRole('button', { name: 'Enter Realm' });
  await expect(enterButton).toBeEnabled();
  await enterButton.click();

  // Wait for redirect to story-maker with action=resume_story_maker
  // The wait time is increased to 15s to handle database/auth latency in local workers
  try {
    await page.waitForURL(url =>
      (url.pathname.includes('/story-maker') && url.searchParams.get('action') === 'resume_story_maker') ||
      (url.pathname.includes('/onboarding')),
      { timeout: 30000 }
    );

    // If we landed on onboarding, handle it (ChildGate might have pushed us here)
    if (page.url().includes('/onboarding')) {
      await completeOnboarding(page, 'LeoHero');
      
      // After onboarding, we should be redirected back to story-maker
      console.log('Onboarding finished, navigating back to story-maker to resume...');
      await page.goto('/story-maker?action=resume_story_maker');
    }
  } catch (e) {
    // If it fails, check for error messages or "check email" notifications
    const onPageText = await page.evaluate(() => document.body.innerText);
    if (onPageText.includes('Check your magic scroll')) {
      throw new Error('Test failed: Received "Check your email" instead of auto-redirection. Ensure local Supabase has email confirmation disabled.');
    }
    throw new Error(`Redirection to story-maker or onboarding failed. Current URL: ${page.url()}. Error: ${e.message}`);
  }

  // Wait for any previous loader to disappear
  await expect(page.getByText('Wait for it...')).not.toBeVisible({ timeout: 30000 });

  await expect(page.getByText('Making Magic...')).toBeVisible({ timeout: 30000 });

  // Wait for the redirect to reader
  try {
    await expect(page).toHaveURL(/\/reader\//, { timeout: 60000 });
  } catch (e) {
    // DIAGNOSTIC: Check if an error alert is visible
    const errorAlert = page.locator('.bg-red-50, .text-red-600, [role="alert"]');
    if (await errorAlert.count() > 0) {
      const errorText = await errorAlert.innerText();
      throw new Error(`Test failed during generation. App error visible: "${errorText.trim()}"`);
    }

    // Capture state to see if we are stuck on loader or fell back
    const isLoaderVisible = await page.getByText('Making Magic...').isVisible();
    throw new Error(`Reader redirection timed out. URL: ${page.url()}. Loader visible: ${isLoaderVisible}. Error: ${e.message}`);
  }
  await expect(page.getByText('Leo').first()).toBeVisible();

  // Assert that image blocks exist (skeleton or actual)
  const imageBlocks = page.locator('.book-image-block');
  await expect(imageBlocks.first()).toBeVisible({ timeout: 30000 });

  // Check that we have at least 2 images (Sun Wukong fixture has 2, mock provider might repeat them)
  const count = await imageBlocks.count();
  expect(count).toBeGreaterThanOrEqual(2);

  // Wait for the actual images to finish generating and being visible
  // The mock provider has a 2.5s cumulative latency (1s for story + 2s for images)
  await expect(page.locator('.book-image').first()).toBeVisible({ timeout: 60000 });

  // Verify that there are no "broken" skeletons left
  await expect(page.locator('.book-image-skeleton')).toHaveCount(0, { timeout: 30000 });
});
