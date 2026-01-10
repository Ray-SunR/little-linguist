"use client";

import { useEffect } from "react";
import DashboardUI from "@/components/dashboard/DashboardUI";
import { useAuth } from "@/components/auth/auth-provider";
import { useRouter } from "next/navigation";
import { ChildProfile } from "@/app/actions/profiles";

interface DashboardContentProps {
  serverProfiles?: ChildProfile[];
}

export default function DashboardContent({ serverProfiles = [] }: DashboardContentProps) {
  const { user, profiles, activeChild, isLoading } = useAuth();
  const router = useRouter();

  // effectiveProfiles combines server data + client data (client wins if populated)
  const effectiveProfiles = profiles.length > 0 ? profiles : serverProfiles;

  // We determine "loading" by whether we have data OR if the auth provider is properly loading
  // If we have server data, we are NOT loading in terms of "blocking UI".
  // However, we still rely on `user` object.
  // If `user` is present (from prop or context) and profiles are empty, we redirect.

  useEffect(() => {
    // Only redirect to onboarding if authenticated but no profiles.
    // Guests (user=null) should be allowed to see the dashboard preview.

    // Safety: Wait for auth loading to finish UNLESS we have server profiles passed down?
    // Actually, if we have serverProfiles, we know the state.
    // Note: serverProfiles comes from a Server Component that checked getUser().

    // If we rely purely on `useAuth`, we might hit the race condition.
    // So we use effectiveProfiles.

    // But `user` might still be null in context while `serverProfiles` is populated?
    // No, ProfileHydrator handles that sync.

    // The critical check that was failing:
    // if (!isLoading && user && profiles.length === 0)

    // New check:
    const hasProfiles = effectiveProfiles.length > 0;

    if (!isLoading && user && !hasProfiles) {
      router.push("/onboarding");
    }
  }, [effectiveProfiles, isLoading, router, user, profiles]);

  // DashboardUI handles its own empty states, we just pass activeChild
  return (
    <DashboardUI activeChild={activeChild} />
  );
}
