import { test, expect } from '@playwright/test';

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

  // 1. Login
  await page.goto('/login');
  const emailInput = page.getByPlaceholder('Magic Email');
  await emailInput.fill(testEmail);
  await page.getByRole('button', { name: 'Continue' }).click();

  const passwordInput = page.getByPlaceholder('Secret Word');
  await passwordInput.fill('password123');
  await passwordInput.press('Enter');

  // Wait for login redirect to settle
  console.log('Waiting for login to complete...');
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30000 });
  
  // Wait a bit for the redirection to settle (to onboarding or dashboard)
  await page.waitForTimeout(3000);

  // 2. Handle Onboarding if it appears
  if (page.url().includes('/onboarding')) {
    console.log('Onboarding detected, completing wizard...');
    
    // Step: Name
    const nameInput = page.getByPlaceholder('Leo, Mia, Sam...');
    await expect(nameInput).toBeVisible({ timeout: 15000 });
    await nameInput.fill('MissionHero');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step: Age
    await page.getByRole('button', { name: 'Yep!' }).click();

    // Step: Gender
    await page.getByText('Boy').click();
    await page.getByRole('button', { name: 'Next' }).click();

    // Step: Avatar
    await page.getByRole('button', { name: 'Skip' }).click();

    // Step: Interests
    // Select some interests to get recommendations
    await page.getByText('Space').first().click();
    await page.getByText('Dinosaurs').first().click();
    await page.getByRole('button', { name: 'Finish!' }).click();
    
    // Wait for navigation to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
  } else {
    // If not on onboarding, explicitly go to dashboard
    console.log('Not on onboarding, navigating to dashboard...');
    await page.goto('/dashboard');
  }

  // 3. Go to Dashboard
  console.log('Checking for Mission Control...');
  await expect(page.getByText('Mission Control')).toBeVisible({ timeout: 30000 });

  // 4. Identify a mission book
  // Find a "Start" button which links to a mission
  const missionStartBtn = page.locator('a[href*="mission=true"]').first();
  
  // If no mission is found, we might need to wait or refresh
  try {
    await expect(missionStartBtn).toBeVisible({ timeout: 20000 });
  } catch (e) {
    console.log('No mission found in Active Missions, checking if "All Missions Clear!" is visible');
    if (await page.getByText('All Missions Clear!').isVisible()) {
        console.log('Missions are clear, trying to create a story first to populate recommendations...');
        await page.goto('/story-maker');
        // Wait for story maker to load
        await page.waitForSelector('input', { timeout: 15000 });
        const storyInput = page.locator('input[placeholder*="A Dinosaur Space Race"], input[placeholder*="Space, Dinosaurs"]').first();
        await storyInput.fill('A Mission Adventure');
        await page.getByRole('button', { name: /Create Story|Next Step/ }).first().click();
        
        // Wait for generation and reader
        await expect(page).toHaveURL(/\/reader\//, { timeout: 60000 });
        console.log('Story created, returning to dashboard...');
        await page.goto('/dashboard');
        await expect(missionStartBtn).toBeVisible({ timeout: 20000 });
    } else {
        throw e;
    }
  }

  // Find the title of the book we are starting
  const missionCardInitial = page.locator('.clay-card').filter({ has: missionStartBtn });
  const bookTitle = await missionCardInitial.locator('h2').innerText();
  console.log(`Starting mission for book: ${bookTitle}`);

  // 5. Click on it to go to the reader
  await missionStartBtn.click();

  // 6. Wait for the reader to load
  await expect(page).toHaveURL(/\/reader\//, { timeout: 30000 });
  await expect(page.locator('#reader-text-content')).toBeVisible({ timeout: 30000 });

  // 7. Set the current token index to the last word to trigger completion
  console.log('Simulating reading to the end by clicking the last word...');
  const lastWord = page.locator('[data-word-index]').last();
  await lastWord.scrollIntoViewIfNeeded();
  await lastWord.click();

  // Wait for the click to process and state to update
  // We wait 10 seconds to ensure multiple save attempts and DB sync
  console.log('Waiting for completion state to sync...');
  await page.waitForTimeout(10000);

  // 8. Click the "Back" button in the reader
  console.log('Clicking Back button...');
  const backBtn = page.locator('#reader-back-to-library');
  await backBtn.click();

  // 9. Wait for navigation back to /dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });

  // 10. Verify that the book card now has the "Mission Accomplished" stamp
  console.log(`Verifying Mission Accomplished stamp for "${bookTitle}"...`);
  
  // Diagnostic: log all cards
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.clay-card')) as HTMLElement[];
    cards.forEach(card => {
        const title = card.querySelector('h2')?.innerText;
        const text = card.innerText;
        console.log(`DEBUG CARD: "${title}", Text includes Accomplished: ${text.includes('Accomplished')}, Text includes Archived: ${text.includes('Archived')}`);
    });
  });

  const missionCardResult = page.locator('.clay-card').filter({ hasText: bookTitle });
  
  // It might need a refresh or a bit more time if the DB is slow
  try {
    await expect(missionCardResult.getByText(/Mission.*Accomplished/s)).toBeVisible({ timeout: 20000 });
  } catch (e) {
    console.log('Stamp not visible yet, checking Achievements then reloading page...');
    const achievement = page.getByText(/Finished|Mission/);
    if (await achievement.count() > 0) {
        console.log('Found achievement entry:', await achievement.first().innerText());
    }
    
    await page.reload();
    await page.waitForTimeout(3000);

    // Diagnostic again
    await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.clay-card')) as HTMLElement[];
        cards.forEach(card => {
            const title = card.querySelector('h2')?.innerText;
            const text = card.innerText;
            console.log(`DEBUG CARD AFTER RELOAD: "${title}", Text includes Accomplished: ${text.includes('Accomplished')}`);
        });
    });

    await expect(missionCardResult.getByText(/Mission.*Accomplished/s)).toBeVisible({ timeout: 15000 });
  }
  
  console.log('Test PASSED: Mission sync verified.');
});
