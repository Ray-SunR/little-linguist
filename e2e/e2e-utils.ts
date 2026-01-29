import { expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

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
    await expect(page.getByText("Stories They'll")).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Space' }).click();
    await page.getByTestId('onboarding-finish').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 120000 });
  }
}

const TEST_TARGET = process.env.TEST_TARGET || 'beta';
const envFile = TEST_TARGET === 'local' ? '.env.development.local' : '.env.beta.local';
const envPath = path.resolve(process.cwd(), envFile);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
} else {
  console.error(`❌ ERROR: ${envFile} not found.`);
  if (TEST_TARGET === 'local') {
    console.error('E2E tests must run against a local Supabase instance.');
    console.error('Run "npm run supabase:setup" to initialize your local environment.');
  } else {
    console.error('E2E tests are defaulting to the Beta environment.');
    console.error('Ensure you have downloaded the Beta credentials into .env.beta.local.');
  }
  process.exit(1);
}

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
  const { data: authData, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error && !error.message.toLowerCase().includes('already')) {
    throw error;
  }

  const userId = authData?.user?.id;
  console.log(`[E2E-Utils] Created/Found user: ${email} (ID: ${userId})`);

  const deadline = Date.now() + 10000; // Increased to 10s
  while (Date.now() < deadline) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle<{ id: string }>();
    if (data?.id) {
      console.log(`[E2E-Utils] Profile verified for ${email} (Profile ID: ${data.id})`);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Profile creation timed out for ${email}`);
}

export async function ensureChildProfile(email: string, childName: string = 'MissionHero') {
  const supabase = getAdminClient();
  
  // Get User ID
  const { data: userData } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single<any>();
    
  if (!userData?.id) throw new Error(`User not found for ${email}`);
  const userId = userData.id;

  // Check if child exists
  const { data: existingChild } = await supabase
    .from('children')
    .select('id')
    .eq('owner_user_id', userId)
    .eq('first_name', childName)
    .maybeSingle<any>();

  if (existingChild) {
    console.log(`[E2E-Utils] Child profile found for ${email} (ID: ${existingChild.id})`);
    return existingChild.id;
  }

  // Create child
  const { data: newChild, error } = await supabase
    .from('children')
    .insert({
        owner_user_id: userId,
        first_name: childName,
        birth_year: 2020,
        gender: 'boy',
        interests: ['Space', 'Dinosaurs'],
        avatar_paths: [],
        primary_avatar_index: 0
    } as any)
    .select()
    .single<any>();

  if (error) {
    console.error('[E2E-Utils] Failed to create child profile:', error);
    throw error;
  }

  console.log(`[E2E-Utils] Created child profile for ${email} (ID: ${newChild.id})`);
  return newChild.id;
}
