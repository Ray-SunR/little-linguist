import { test, expect } from '@playwright/test';
import { ensureTestUser, completeOnboarding } from './e2e-utils';

test.describe('Profile Persistence and Management', () => {
  // Use a unique email for each run to avoid collisions
  const testEmail = `persistence-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
  const password = 'password123';

  test('should persist child profile and allow adding multiple heroes', async ({ page, context }) => {
    test.setTimeout(180000);
    
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

    console.log(`Starting persistence test with email: ${testEmail}`);
    await ensureTestUser(testEmail, password);

    // 1. Initial login and onboarding
    await page.goto('/login');
    await page.getByPlaceholder('Magic Email').fill(testEmail);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('Secret Word').fill(password);
    await page.getByRole('button', { name: 'Enter Realm' }).click();

    await page.waitForURL(/\/onboarding/);
    await completeOnboarding(page, 'FirstHero');
    
    // Should land on dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 60000 });
    await expect(page.getByText('Mission Control')).toBeVisible();

    // 2. Clear state to simulate fresh session (Logging back in)
    console.log('Simulating fresh login...');
    await context.clearCookies();
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem('lumo_tutorial_completed_v2', 'true');
      window.localStorage.setItem('lumo-cookie-consent', 'accepted');
    });

    // 3. Login again
    await page.goto('/login');
    await page.getByPlaceholder('Magic Email').fill(testEmail);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('Secret Word').fill(password);
    await page.getByRole('button', { name: 'Enter Realm' }).click();

    // 4. Verify no redirect to onboarding (lands on dashboard because profile exists)
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 60000 });
    expect(page.url()).not.toContain('/onboarding');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Mission Control')).toBeVisible();

    // 5. Navigate to Profiles and add a second child
    console.log('Adding a second hero...');
    await page.goto('/profiles');
    await expect(page.getByText('Your Heroes')).toBeVisible();
    await expect(page.getByText('FirstHero')).toBeVisible();

    await page.getByRole('button', { name: 'Add Explorer' }).click();

    // Fill second hero details (Manual steps to ensure wizard handling outside onboarding route)
    const nameInput = page.getByPlaceholder('Leo, Mia, Sam...');
    await expect(nameInput).toBeVisible({ timeout: 15000 });
    await nameInput.fill('SecondHero');
    await page.getByTestId('identity-continue-name').click();
    
    await expect(page.getByTestId('hero-identity-form')).toHaveAttribute('data-step', 'age', { timeout: 10000 });
    await page.getByTestId('identity-continue-age').click();

    await expect(page.getByTestId('hero-identity-form')).toHaveAttribute('data-step', 'gender', { timeout: 10000 });
    await page.getByTestId('gender-button-girl').click();
    await page.getByTestId('identity-continue-gender').click();

    await expect(page.getByTestId('hero-identity-form')).toHaveAttribute('data-step', 'avatar', { timeout: 10000 });
    await page.getByTestId('identity-complete').click();
    
    // Interests
    await expect(page.getByText("Stories They'll")).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Space' }).click();
    await page.getByTestId('onboarding-finish').click({ force: true });

    // 6. Verify second child exists and we are back on dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 60000 });
    
    // Check profiles page for both
    await page.goto('/profiles');
    await expect(page.getByText('FirstHero')).toBeVisible();
    await expect(page.getByText('SecondHero')).toBeVisible();
  });
});
