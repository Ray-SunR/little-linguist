import { test, expect } from '@playwright/test';

test('Daily Mission Persistence E2E', async ({ page, context }) => {
  test.setTimeout(60000);

  // Ensure fresh state
  await context.clearCookies();

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('lumo_tutorial_completed_v2', 'true');
    window.localStorage.setItem('lumo-cookie-consent', 'accepted');
  });

  const testEmail = `test-mission-${Date.now()}@example.com`;

  // 1. Sign up/Login
  await page.goto('/login');
  await page.getByPlaceholder('Magic Email').fill(testEmail);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByPlaceholder('Secret Word').fill('password123');
  await page.keyboard.press('Enter');

  // 2. Wait for dashboard and capture missions
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
  
  // Wait for recommendations to load
  await expect(page.getByText('Active Missions')).toBeVisible();
  
  const missionTitles = page.locator('h2');
  await expect(missionTitles).toHaveCount(3);
  
  const initialTitles = await missionTitles.allInnerTexts();
  console.log('Initial Mission Titles:', initialTitles);

  // 3. Refresh the page
  await page.reload();
  await expect(page.getByText('Active Missions')).toBeVisible();

  // 4. Verify titles are identical
  const refreshedTitles = await missionTitles.allInnerTexts();
  console.log('Refreshed Mission Titles:', refreshedTitles);

  expect(refreshedTitles).toEqual(initialTitles);
});
