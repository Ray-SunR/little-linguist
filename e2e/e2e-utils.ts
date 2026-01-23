import { Page, expect } from '@playwright/test';

/**
 * Completes the onboarding wizard if the page is currently on the onboarding route.
 * @param page Playwright Page object
 * @param childName Name to use for the child profile
 */
export async function completeOnboarding(page: Page, childName: string = 'LeoHero') {
  if (page.url().includes('/onboarding')) {
    console.log(`Onboarding detected at ${page.url()}, completing wizard for ${childName}...`);
    
    const nameInput = page.getByPlaceholder('Leo, Mia, Sam...');
    await expect(nameInput).toBeVisible({ timeout: 15000 });
    await nameInput.fill(childName);
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Step: Age - "Are you at least 3 years old?" or similar
    await page.getByRole('button', { name: 'Yep!' }).click();

    // Step: Gender
    await page.getByRole('button', { name: 'Boy' }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    // Step: Avatar
    await page.getByRole('button', { name: 'Skip' }).click();

    // Step: Interests
    await page.getByText('Space').first().click();
    await page.getByRole('button', { name: 'Finish!' }).click();
  }
}
