import { expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

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
    await page.getByTestId('identity-continue-name').click();
    
    // Step: Age - "Are you at least 3 years old?" or similar
    await expect(page.getByTestId('hero-identity-form')).toHaveAttribute('data-step', 'age', { timeout: 15000 });
    await page.getByTestId('identity-continue-age').click();

    // Step: Gender
    await expect(page.getByTestId('hero-identity-form')).toHaveAttribute('data-step', 'gender', { timeout: 15000 });
    await page.getByTestId('gender-button-boy').click();
    await page.getByTestId('identity-continue-gender').click();

    // Step: Avatar
    await expect(page.getByTestId('hero-identity-form')).toHaveAttribute('data-step', 'avatar', { timeout: 15000 });
    await page.getByTestId('identity-complete').click();

    // Step: Interests
    console.log('Selecting interests...');
    await expect(page.getByText('Magic Interests!')).toBeVisible({ timeout: 15000 });
    await page.getByText('Space').first().click();
    await page.getByTestId('onboarding-finish').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 120000 });
  }
}

dotenv.config({ path: path.resolve(__dirname, '..', '.env.development.local') });

let adminClient: ReturnType<typeof createClient> | null = null;

function getAdminClient() {
  if (adminClient) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase service role env vars for e2e tests.');
  }
  adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}

export async function ensureTestUser(email: string, password: string) {
  const supabase = getAdminClient();
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error && !error.message.toLowerCase().includes('already')) {
    throw error;
  }

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle<{ id: string }>();
    if (data?.id) return;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}
