import React from 'react';
import { redirect } from 'next/navigation';

(global as any).React = React;
import DashboardPage from '@/app/dashboard/page';
import { getChildren } from '@/app/actions/profiles';
import { vi, expect, it, describe, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@/app/actions/profiles', () => ({
  getChildren: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
    },
  })),
}));

vi.mock('@/app/actions/dashboard', () => ({
  getDashboardStats: vi.fn().mockResolvedValue({ success: true, data: {} }),
}));

vi.mock('@/components/ui/lumo-loader', () => ({
  default: () => null,
}));

vi.mock('@/components/auth/profile-hydrator', () => ({
  ProfileHydrator: () => null,
}));

vi.mock('./DashboardContent', () => ({
  default: () => null,
}));

vi.mock('@/components/ui/client-only', () => ({
  ClientOnly: ({ children }: any) => children,
}));

vi.mock('@/components/dashboard/DashboardGuestPrompt', () => ({
  default: () => null,
}));

describe('DashboardPage Redirection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /onboarding if no profiles exist', async () => {
    (getChildren as any).mockResolvedValue({ data: [], error: null });
    await DashboardPage();
    expect(redirect).toHaveBeenCalledWith('/onboarding');
  });

  it('does not redirect if profiles exist', async () => {
    (getChildren as any).mockResolvedValue({ data: [{ id: '1', name: 'Profile 1' }], error: null });
    await DashboardPage();
    expect(redirect).not.toHaveBeenCalled();
  });
});
