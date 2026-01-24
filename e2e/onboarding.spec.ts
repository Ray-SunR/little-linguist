import { test, expect } from '@playwright/test';
import { ensureTestUser } from './e2e-utils';

test('New user onboarding flow', async ({ page, context }) => {
  test.setTimeout(60000);

  // Ensure fresh state
  await context.clearCookies();
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('lumo_tutorial_completed_v2', 'true');
    window.localStorage.setItem('lumo-cookie-consent', 'accepted');
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

  const testEmail = `onboarding-${Date.now()}@example.com`;
  await ensureTestUser(testEmail, 'password123');

  await page.goto('/login');
  await page.getByPlaceholder('Magic Email').fill(testEmail);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByPlaceholder('Secret Word').fill('password123');
  await page.getByRole('button', { name: 'Enter Realm' }).click();

  // Should redirect to onboarding since there are no profiles
  await page.waitForURL(/\/onboarding/);

  // Identity steps
  console.log('Entering name...');
  await page.getByPlaceholder('Leo, Mia, Sam...').fill('Skywalker');
  await page.getByTestId('identity-continue-name').click({ force: true });
  
  console.log('Checking for age step...');
  await expect(page.getByTestId('hero-identity-form')).toHaveAttribute('data-step', 'age', { timeout: 10000 });
  await page.getByTestId('identity-continue-age').click({ force: true });

  console.log('Selecting gender...');
  await expect(page.getByTestId('hero-identity-form')).toHaveAttribute('data-step', 'gender', { timeout: 10000 });
  await page.getByTestId('gender-button-boy').click({ force: true });
  await page.getByTestId('identity-continue-gender').click({ force: true });

  console.log('Skipping avatar...');
  await expect(page.getByTestId('hero-identity-form')).toHaveAttribute('data-step', 'avatar', { timeout: 10000 });
  await page.getByTestId('identity-complete').click({ force: true });

  // Interests step
  console.log('Selecting interests...');
  await expect(page.getByText('Magic Interests!')).toBeVisible();
  await page.getByRole('button', { name: 'Space' }).click();
  await page.getByRole('button', { name: 'Adventure' }).click();
  
  console.log('Finishing onboarding...');
  await page.getByTestId('onboarding-finish').click({ force: true });

  // Should redirect to library or dashboard
  console.log('Waiting for dashboard redirect...');
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });
  await expect(page.getByText('Mission Control')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Explorer Status')).toBeVisible({ timeout: 15000 });
});
