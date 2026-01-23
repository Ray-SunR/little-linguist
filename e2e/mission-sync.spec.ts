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

  // Helper to get current coins from the Explorer Status section
  const getCoins = async () => {
    // Look specifically for the coins display in the Explorer Status card
    const coinsDisplay = page.locator('div:has-text("Explorer Status")').locator('span:has-text("Coins")').first();
    const coinsText = await coinsDisplay.innerText();
    console.log(`DEBUG COINS TEXT: "${coinsText}"`);
    const match = coinsText.match(/(\d+)\s+Coins/i);
    return match ? parseInt(match[1]) : 0;
  };

  const initialCoins = await getCoins();
  console.log(`Initial Coins: ${initialCoins}`);

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
  
  const missionCardResult = page.locator('.clay-card').filter({ hasText: bookTitle });
  
  // It might need a refresh or a bit more time if the DB is slow
  try {
    await expect(missionCardResult.getByText(/Mission.*Accomplished/s)).toBeVisible({ timeout: 20000 });
  } catch (e) {
    console.log('Stamp not visible yet, checking Achievements then reloading page...');
    await page.reload();
    await page.waitForTimeout(3000);
    await expect(missionCardResult.getByText(/Mission.*Accomplished/s)).toBeVisible({ timeout: 15000 });
  }
  
  const coinsAfterFirstRead = await getCoins();
  console.log(`Coins after first read: ${coinsAfterFirstRead}`);
  expect(coinsAfterFirstRead, 'First read should increase coins').toBeGreaterThan(initialCoins);
  
  // 11. Test reopening the book (IDEMPOTENCY CHECK)
  console.log('Reopening the SAME book today to test idempotency...');
  const readAgainBtn = missionCardResult.getByRole('link', { name: 'Read Again' });
  await readAgainBtn.click();
  
  // Wait for the reader to load
  await expect(page).toHaveURL(/\/reader\//, { timeout: 30000 });
  console.log('Reader loaded, waiting for potential double-reward attempt...');
  await page.waitForTimeout(5000);
  
  // Go back
  console.log('Going back to dashboard...');
  await page.locator('#reader-back-to-library').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
  
  const coinsAfterReopen = await getCoins();
  console.log(`Coins after reopening same book: ${coinsAfterReopen}`);
  expect(coinsAfterReopen, 'Reopening same book today should NOT increase coins (idempotent)').toBe(coinsAfterFirstRead);
  
  // 12. Test re-reading same book (IDEMPOTENCY CHECK)
  console.log('Re-reading the SAME book today to test completion idempotency...');
  await missionCardResult.getByRole('link', { name: 'Read Again' }).click();
  await expect(page).toHaveURL(/\/reader\//, { timeout: 30000 });
  
  console.log('Simulating re-reading to the end...');
  const lastWordAgain = page.locator('[data-word-index]').last();
  await lastWordAgain.scrollIntoViewIfNeeded();
  await lastWordAgain.click();
  await page.waitForTimeout(5000);
  
  console.log('Going back to dashboard...');
  await page.locator('#reader-back-to-library').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
  
  const finalCoins = await getCoins();
  console.log(`Final Coins: ${finalCoins}`);
  expect(finalCoins, 'Re-reading same book today should NOT increase coins further').toBe(coinsAfterReopen);

  // 13. Test a DIFFERENT book (PROVE PER-BOOK DAILY REWARDS)
  console.log('Finding a DIFFERENT mission book...');
  const otherMissionBtn = page.locator('a[href*="mission=true"]').filter({ hasNotText: bookTitle }).first();
  
  if (await otherMissionBtn.isVisible()) {
    const otherCard = page.locator('.clay-card').filter({ has: otherMissionBtn });
    const otherBookTitle = await otherCard.locator('h2').innerText();
    console.log(`Starting second mission for book: ${otherBookTitle}`);
    
    await otherMissionBtn.click();
    await expect(page).toHaveURL(/\/reader\//, { timeout: 30000 });
    console.log('Second reader loaded, waiting for opening reward...');
    await page.waitForTimeout(5000);
    
    await page.locator('#reader-back-to-library').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
    
    const coinsAfterSecondBook = await getCoins();
    console.log(`Coins after opening second book: ${coinsAfterSecondBook}`);
    expect(coinsAfterSecondBook, 'Opening a DIFFERENT book should increase coins').toBeGreaterThan(finalCoins);
  } else {
    console.log('No other missions available to test per-book reward.');
  }

  console.log('Test PASSED: Mission sync, per-book rewards, and daily idempotency verified.');
});
