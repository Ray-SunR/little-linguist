import { test, expect } from '@playwright/test';

test('Library books have covers and interactive content', async ({ page, context }) => {
  test.setTimeout(60000);

  // Ensure fresh state
  await context.clearCookies();

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('lumo_tutorial_completed_v2', 'true');
    window.localStorage.setItem('lumo-cookie-consent', 'accepted');
  });

  const testEmail = `test-library-${Date.now()}@example.com`;

  // 1. Login/Signup
  await page.goto('/login');
  await page.getByPlaceholder('Magic Email').fill(testEmail);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByPlaceholder('Secret Word').fill('password123');
  await page.keyboard.press('Enter');

  // 2. Handle onboarding if needed
  try {
      await expect(page).toHaveURL(/\/onboarding/, { timeout: 10000 });
      await page.getByPlaceholder("Child's first name").fill('TestBot');
      await page.getByText('Boy').click();
      await page.getByRole('button', { name: 'Next' }).click();
      
      // Wait for interests to load and select some
      const interestLabel = page.locator('label').filter({ hasText: 'Animals' });
      await interestLabel.waitFor({ state: 'visible' });
      await interestLabel.click();

      await page.getByRole('button', { name: "Create profile" }).click();
  } catch (e) {
      // Already on dashboard or other flow
      console.log('Skipping onboarding or already on dashboard');
  }

  // 3. Wait for dashboard/library
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
  
  // Navigate to library if not there
  if (await page.getByRole('link', { name: 'Browse All' }).isVisible()) {
      await page.getByRole('link', { name: 'Browse All' }).click();
  }

  // 3. Verify cover images are present (not broken)
  const bookCovers = page.locator('img[alt*="Cover"]');
  await expect(bookCovers.first()).toBeVisible();
  
  const coverSrc = await bookCovers.first().getAttribute('src');
  console.log('Sample Cover Src:', coverSrc);
  
  // Expect signed URL or valid path (contains book-assets bucket info)
  expect(coverSrc).toContain('book-assets');

  // 4. Open a book and verify content
  const firstBook = page.locator('h2').first();
  const bookTitle = await firstBook.innerText();
  console.log('Opening book:', bookTitle);
  
  await firstBook.click();
  await expect(page).toHaveURL(/\/reader\//);

  // 5. Verify text tokens are rendered (Word tokens should be span elements)
  const wordTokens = page.locator('span[data-word-index]');
  await expect(wordTokens.first()).toBeVisible({ timeout: 15000 });
  
  const tokenCount = await wordTokens.count();
  console.log(`Found ${tokenCount} word tokens in reader`);
  expect(tokenCount).toBeGreaterThan(0);
});
