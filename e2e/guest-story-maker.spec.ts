import { test, expect } from '@playwright/test';

test('Full Guest to Story Workflow', async ({ page }) => {
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
  await page.getByRole('button', { name: 'Enter Realm' }).click();

  await expect(page).toHaveURL(/\/story-maker/);
  await expect(page).toHaveURL(/action=resume_story_maker/);

  await expect(page.getByText('Making Magic...')).toBeVisible({ timeout: 15000 });

  await expect(page).toHaveURL(/\/reader\//, { timeout: 60000 });
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
