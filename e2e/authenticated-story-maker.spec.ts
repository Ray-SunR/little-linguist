import { test, expect } from '@playwright/test';

test('Authenticated Story Maker Workflow', async ({ page }) => {
  test.setTimeout(120000);

  await page.addInitScript(() => {
    window.localStorage.setItem('lumo_tutorial_completed_v2', 'true');
    window.localStorage.setItem('lumo-cookie-consent', 'accepted');
  });

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  const testEmail = `test-auth-${Date.now()}@example.com`;
  
  await page.goto('/login');
  await page.getByPlaceholder('Magic Email').fill(testEmail);
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByPlaceholder('Secret Word').fill('password123');
  await page.getByRole('button', { name: 'Enter Realm' }).click();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 30000 });

  await page.goto('/story-maker');

  await expect(page.getByText('Wait for it...')).not.toBeVisible({ timeout: 30000 });

  const heroNameInput = page.getByPlaceholder('Hero Name...');
  const guestNameInput = page.getByPlaceholder('Leo, Mia, Sam...');

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

  await expect(page.getByText('Making Magic...')).toBeVisible({ timeout: 15000 });
  
  await expect(page).toHaveURL(/\/reader\//, { timeout: 60000 });
  await expect(page.getByText('Leo').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/mock-result.png' });
});
