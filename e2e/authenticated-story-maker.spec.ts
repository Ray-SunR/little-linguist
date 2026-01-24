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

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  const testEmail = `test-auth-${Date.now()}@example.com`;
  await ensureTestUser(testEmail, 'password123');

  await page.goto('/login');
  const emailInput = page.getByPlaceholder('Magic Email');
  await emailInput.click();
  await emailInput.pressSequentially(testEmail, { delay: 50 });
  await page.waitForTimeout(500); // Wait for validation to kick in
  await page.getByRole('button', { name: 'Continue' }).click();

  const passwordInput = page.getByPlaceholder('Secret Word');
  await passwordInput.fill('password123');
  const enterButton = page.getByRole('button', { name: 'Enter Realm' });
  await expect(enterButton).toBeEnabled();
  await enterButton.click();

  // Wait for login to complete and any automatic redirects to begin
  try {
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 120000 });
  } catch (e) {
    const onPageText = await page.evaluate(() => document.body.innerText);
    throw new Error(`Login redirect failed. Current URL: ${page.url()}. Page text: ${onPageText.slice(0, 500)}`);
  }

  // WebKit can be finicky with rapid navigations. 
  // Wait for the URL to settle (e.g., reached /dashboard or onboarding)
  await page.waitForTimeout(2000);

  // If we landed on onboarding, handle it
  if (page.url().includes('/onboarding')) {
    await completeOnboarding(page, 'AuthKid');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
  }

  // Now navigate to our target page
  console.log('Navigating to story-maker...');
  await page.goto('/story-maker', { waitUntil: 'load' });
  await expect(page.getByText('Wait for it...')).not.toBeVisible({ timeout: 60000 });

  const heroNameInput = page.getByPlaceholder('Hero Name...');
  const guestNameInput = page.getByPlaceholder('Leo, Mia, Sam...');

  // Wait for one of them to be visible
  await expect(guestNameInput.or(heroNameInput)).toBeVisible({ timeout: 15000 });

  if (await guestNameInput.isVisible()) {
    await guestNameInput.fill('Leo');
    await page.getByRole('button', { name: 'Continue' }).click();
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
  } else {
    await heroNameInput.fill('Leo');
    await page.getByRole('button', { name: '👦' }).click();
    await page.getByPlaceholder('e.g. A Dinosaur Space Race...').fill('Dinosaurs');
    await page.getByPlaceholder('e.g. Underwater Kingdom...').fill('Space');
    await page.getByRole('button', { name: 'Next Step' }).click();

    const responsePromise = page.waitForResponse(response => response.url().includes('/api/story') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Skip and create anyway' }).click();

    const response = await responsePromise;
    console.log('API Response Status:', response.status());
    if (response.status() !== 200) {
      console.log('API Error Body:', await response.text());
    }
  }

  // Wait for either the loader OR the reader (to handle very fast redirections)
  const loader = page.getByText('Making Magic...');
  const readerHeader = page.getByRole('heading', { name: /'s Great Adventure/ });

  await expect(loader.or(readerHeader)).toBeVisible({ timeout: 60000 });

  // Reader redirection
  try {
    await expect(page).toHaveURL(/\/reader\//, { timeout: 60000 });
  } catch (e) {
    const errorAlert = page.locator('.bg-red-50, .text-red-600, [role="alert"]');
    if (await errorAlert.count() > 0) {
      const errorText = await errorAlert.innerText();
      throw new Error(`Test failed during generation. App error visible: "${errorText.trim()}"`);
    }
    throw new Error(`Reader redirection timed out. URL: ${page.url()}. Error: ${e.message}`);
  }
  await expect(page.getByText('Leo').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/mock-result.png' });
});
